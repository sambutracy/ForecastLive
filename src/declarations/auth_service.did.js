export const idlFactory = ({ IDL }) => {
  const UserProfile = IDL.Record({
    'principal' : IDL.Principal,
    'username' : IDL.Text,
    'authType' : IDL.Text,
    'createdAt' : IDL.Int,
    'role' : IDL.Text,
    'email' : IDL.Opt(IDL.Text),
  });
  const Result = IDL.Variant({ 'ok' : UserProfile, 'err' : IDL.Text });
  const LoginResult = IDL.Variant({
    'error' : IDL.Text,
    'success' : IDL.Record({ 'token' : IDL.Text, 'user' : UserProfile }),
  });
  return IDL.Service({
    'authenticateWithII' : IDL.Func([], [Result], []),
    'createInitialAdmin' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text],
        [IDL.Bool],
        [],
      ),
    'getAllUsers' : IDL.Func([], [IDL.Vec(UserProfile)], []),
    'getUserByToken' : IDL.Func([IDL.Text], [IDL.Opt(UserProfile)], ['query']),
    'icrc10_supported_standards' : IDL.Func(
        [],
        [IDL.Vec(IDL.Record({ 'url' : IDL.Text, 'name' : IDL.Text }))],
        ['query'],
      ),
    'icrc28_trusted_origins' : IDL.Func(
        [],
        [IDL.Record({ 'trusted_origins' : IDL.Vec(IDL.Text) })],
        ['query'],
      ),
    'login' : IDL.Func([IDL.Text, IDL.Text], [LoginResult], []),
    'logout' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'promoteToAdmin' : IDL.Func([IDL.Principal], [IDL.Bool], []),
    'register' : IDL.Func([IDL.Text, IDL.Text, IDL.Text], [Result], []),
    'updateIIUserProfile' : IDL.Func([IDL.Text], [Result], []),
    'verifySession' : IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    'whoami' : IDL.Func([], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
