import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Navigate } from 'react-router-dom';
import { TextField } from '../../components/forms/TextField/TextField';
import { Button } from '../../components/core/Button/Button';
import { authApi } from '../../api/auth';
import type { SignInRequest } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import styles from './SignInPage.module.scss';
import { resources } from './SignInPage.resources';

export function SignInPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignInRequest>();
  const { signIn, user, isLoading: isAuthLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  if (isAuthLoading) {
    return null;
  }

  if (user) {
    return <Navigate to="/calendar" replace />;
  }

  const onSubmit = async (data: SignInRequest) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await authApi.signIn(data);
      signIn(response.token, { name: response.name, role: response.role });
      navigate('/calendar');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError(resources.errorInvalidCredentials);
      } else {
        setError(resources.errorGeneric);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoMark}>ELC</div>
        <h1 className={styles.title}>{resources.title}</h1>
        <p className={styles.subtitle}>{resources.subtitle}</p>

        {error && <div className={styles.error} data-test="SignIn_ErrorMessage">{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label={resources.usernameLabel}
            type="text"
            autoComplete="username"
            {...register('username', { required: true })}
            error={errors.username ? 'Required' : undefined}
            data-test="SignIn_UsernameInput"
          />
          <TextField
            label={resources.passwordLabel}
            type="password"
            autoComplete="current-password"
            {...register('password', { required: true })}
            error={errors.password ? 'Required' : undefined}
            data-test="SignIn_PasswordInput"
          />
          <Button type="submit" isLoading={isSubmitting} style={{ width: '100%' }} data-test="SignIn_SubmitButton">
            {resources.submitButton}
          </Button>
        </form>
      </div>
    </div>
  );
}
