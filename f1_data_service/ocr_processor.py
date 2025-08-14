import os
import sys
import json
import base64
import argparse
import logging
from typing import Dict, List, Optional, Any, Tuple
import cv2
import numpy as np
import pytesseract
from PIL import Image
import re

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to set Tesseract path for Windows users
if os.name == 'nt':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

class OCRPredictionProcessor:
    """
    Process F1 prediction screenshots using OCR to extract structured prediction data.
    This class handles image preprocessing, text recognition, and prediction parsing.
    """
    
    def __init__(self, tesseract_path: Optional[str] = None):
        """
        Initialize the OCR prediction processor.
        
        Args:
            tesseract_path: Optional path to Tesseract executable
        """
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
            
        # Test Tesseract installation
        try:
            pytesseract.get_tesseract_version()
            logger.info(f"Tesseract version: {pytesseract.get_tesseract_version()}")
        except Exception as e:
            logger.error(f"Tesseract not properly installed or configured: {e}")
            raise RuntimeError("Tesseract OCR is not properly installed or configured.")
            
        # Load driver name mappings for correction
        self.driver_mappings = {
            # Common OCR errors and corrections
            "LECLERC": "leclerc",
            "VERSTAPPEN": "verstappen",
            "HAMILTON": "hamilton",
            "NORRIS": "norris",
            "SAINZ": "sainz",
            "PIASTRI": "piastri",
            "RUSSELL": "russell",
            "PEREZ": "perez",
            "ALONSO": "alonso",
            "STROLL": "stroll",
            "HULKENBERG": "hulkenberg",
            "GASLY": "gasly",
            "OCON": "ocon",
            "ALBON": "albon",
            "TSUNODA": "tsunoda",
            "BOTTAS": "bottas",
            "ZHOU": "zhou",
            "MAGNUSSEN": "magnussen",
            "RICCIARDO": "ricciardo",
            "SARGEANT": "sargeant",
            # Common OCR errors
            "LECL ERC": "leclerc",
            "VERS TAPPEN": "verstappen",
            "HAM ILTON": "hamilton",
            "SA INZ": "sainz",
            "P IASTRI": "piastri",
            "RUS SELL": "russell",
            "PER EZ": "perez",
            "AL ONSO": "alonso",
        }
        
        # Prediction types to look for
        self.prediction_types = [
            "podium", "pole position", "fastest lap", "dnf",
            "first retirement", "safety car", "points finish"
        ]
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """
        Preprocess the image to improve OCR accuracy.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Preprocessed image as numpy array
        """
        # Read the image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not read image from {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply threshold to get black and white image
        _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Noise removal
        kernel = np.ones((1, 1), np.uint8)
        opening = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Invert back
        processed = cv2.bitwise_not(opening)
        
        return processed
    
    def preprocess_image_from_bytes(self, image_bytes: bytes) -> np.ndarray:
        """
        Preprocess image from byte data.
        
        Args:
            image_bytes: Image data as bytes
            
        Returns:
            Preprocessed image as numpy array
        """
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        
        # Decode image
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image from bytes")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply threshold to get black and white image
        _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Noise removal
        kernel = np.ones((1, 1), np.uint8)
        opening = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Invert back
        processed = cv2.bitwise_not(opening)
        
        return processed
    
    def extract_text(self, image: np.ndarray) -> str:
        """
        Extract text from preprocessed image using OCR.
        
        Args:
            image: Preprocessed image as numpy array
            
        Returns:
            Extracted text
        """
        # Use pytesseract to extract text
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(image, config=custom_config)
        
        return text
    
    def normalize_driver_name(self, name: str) -> str:
        """
        Normalize driver name to correct common OCR errors.
        
        Args:
            name: Driver name from OCR
            
        Returns:
            Normalized driver name
        """
        # Convert to uppercase for matching
        upper_name = name.strip().upper()
        
        # Check mappings
        if upper_name in self.driver_mappings:
            return self.driver_mappings[upper_name]
        
        # Remove spaces and check again
        no_space = upper_name.replace(" ", "")
        if no_space in self.driver_mappings:
            return self.driver_mappings[no_space]
        
        # Try mapping with first 4 chars
        if len(upper_name) >= 4:
            first_four = upper_name[:4]
            for key, value in self.driver_mappings.items():
                if key.startswith(first_four):
                    return value
        
        # Return lowercase version if no mapping found
        return name.strip().lower()
    
    def parse_predictions(self, text: str) -> List[Dict[str, Any]]:
        """
        Parse extracted text to identify F1 predictions.
        
        Args:
            text: Extracted text from OCR
            
        Returns:
            List of prediction items with type and driver IDs
        """
        lines = text.split('\n')
        predictions = []
        current_type = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if line contains a prediction type
            lower_line = line.lower()
            for pred_type in self.prediction_types:
                if pred_type in lower_line:
                    current_type = pred_type
                    break
            
            # If we have a prediction type, look for driver names
            if current_type and any(char.isalpha() for char in line):
                # Skip lines that are clearly headers
                if any(keyword in lower_line for keyword in ["prediction", "select", "choose"]):
                    continue
                
                # Extract potential driver names
                potential_drivers = []
                
                # Split by common separators
                parts = re.split(r'[,;|/\\\s]+', line)
                for part in parts:
                    part = part.strip()
                    if len(part) >= 3 and part.lower() not in self.prediction_types:
                        potential_drivers.append(self.normalize_driver_name(part))
                
                # If we found potential drivers, add the prediction
                if potential_drivers:
                    # Check if we already have this prediction type
                    existing_pred = next((p for p in predictions if p["type"] == current_type), None)
                    
                    if existing_pred:
                        # Add to existing prediction, remove duplicates
                        combined = existing_pred["driverIds"] + potential_drivers
                        existing_pred["driverIds"] = list(dict.fromkeys(combined))
                    else:
                        # Create new prediction
                        predictions.append({
                            "type": current_type,
                            "driverIds": potential_drivers
                        })
        
        return predictions
    
    def process_image(self, image_path: str) -> Dict[str, Any]:
        """
        Process an image file to extract F1 predictions.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary with OCR results and parsed predictions
        """
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image_path)
            
            # Extract text
            extracted_text = self.extract_text(processed_image)
            
            # Parse predictions
            predictions = self.parse_predictions(extracted_text)
            
            # Calculate confidence based on prediction count
            confidence = min(len(predictions) * 20, 100) if predictions else 0
            
            return {
                "status": "success" if predictions else "partial",
                "confidence": confidence,
                "detectedText": extracted_text,
                "parsedPredictions": predictions
            }
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return {
                "status": "error",
                "confidence": 0,
                "errorMessage": str(e)
            }
    
    def process_image_bytes(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Process image from byte data to extract F1 predictions.
        
        Args:
            image_bytes: Image data as bytes
            
        Returns:
            Dictionary with OCR results and parsed predictions
        """
        try:
            # Preprocess image
            processed_image = self.preprocess_image_from_bytes(image_bytes)
            
            # Extract text
            extracted_text = self.extract_text(processed_image)
            
            # Parse predictions
            predictions = self.parse_predictions(extracted_text)
            
            # Calculate confidence based on prediction count
            confidence = min(len(predictions) * 20, 100) if predictions else 0
            
            return {
                "status": "success" if predictions else "partial",
                "confidence": confidence,
                "detectedText": extracted_text,
                "parsedPredictions": predictions
            }
        except Exception as e:
            logger.error(f"Error processing image bytes: {e}")
            return {
                "status": "error",
                "confidence": 0,
                "errorMessage": str(e)
            }
    
    def save_debug_image(self, image: np.ndarray, output_path: str) -> None:
        """
        Save preprocessed image for debugging.
        
        Args:
            image: Preprocessed image as numpy array
            output_path: Path to save the debug image
        """
        cv2.imwrite(output_path, image)
        logger.info(f"Debug image saved to {output_path}")


def main():
    """
    Main function to run the OCR prediction processor from command line.
    """
    parser = argparse.ArgumentParser(description='F1 Prediction OCR Processor')
    parser.add_argument('--image', type=str, help='Path to input image')
    parser.add_argument('--tesseract', type=str, help='Path to Tesseract executable')
    parser.add_argument('--debug', action='store_true', help='Save debug images')
    
    args = parser.parse_args()
    
    if not args.image:
        parser.print_help()
        return
    
    processor = OCRPredictionProcessor(args.tesseract)
    
    result = processor.process_image(args.image)
    
    # Print results as JSON
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
