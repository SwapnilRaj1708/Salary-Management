import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { ApiError } from '../../api/client.ts';
import { useLogin } from '../../api/queries.ts';

/** Only same-site paths are followed after login, so a crafted link can't send users away. */
export function safeRedirect(target: string | undefined): string {
  return target?.startsWith('/') && !target.startsWith('//') ? target : '/employees';
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError && error.code === 'INVALID_CREDENTIALS'
    ? 'The email or password is incorrect.'
    : 'Something went wrong. Please try again.';
}

export function LoginPage({ redirect }: { redirect?: string | undefined }) {
  const login = useLogin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => navigate({ href: safeRedirect(redirect), replace: true }) },
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent>
          <Stack component="form" spacing={2} onSubmit={submit} noValidate>
            <Typography variant="h5" component="h1">
              Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Salary Management for ACME's HR team.
            </Typography>
            {login.isError && <Alert severity="error">{errorMessage(login.error)}</Alert>}
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" variant="contained" loading={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
