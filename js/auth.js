// guitar.io - Authentication with Supabase Auth and Alpine.js

/**
 * Alpine.js component for login form
 */
function loginForm() {
    return {
        username: '',
        password: '',
        errorMessage: '',
        isLoading: false,

        async handleLogin() {
            this.errorMessage = '';

            if (!this.username || !this.password) {
                this.errorMessage = 'Please enter both email and password.';
                return;
            }

            if (!isValidEmail(this.username)) {
                this.errorMessage = 'Please enter a valid email address.';
                return;
            }

            this.isLoading = true;

            try {
                await waitForSupabase();
                const supabase = window.guitarIoSupabase;
                if (!supabase) {
                    this.errorMessage =
                        'Sign-in is not configured. Add your Supabase URL and anon key in js/supabase-config.js.';
                    return;
                }

                const email = this.username.toLowerCase().trim();
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password: this.password,
                });

                if (error) {
                    this.errorMessage =
                        error.message ||
                        'Email/password combination not found. Please check your credentials.';
                    return;
                }

                localStorage.removeItem('guitar_io_current_user');

                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error('Login error:', error);
                this.errorMessage = 'An error occurred. Please try again.';
            } finally {
                this.isLoading = false;
            }
        },
    };
}

/**
 * Alpine.js component for registration form
 */
function registerForm() {
    return {
        username: '',
        password: '',
        confirmPassword: '',
        errorMessage: '',
        successMessage: '',
        isLoading: false,

        async handleRegister() {
            this.errorMessage = '';
            this.successMessage = '';

            if (!this.username || !this.password || !this.confirmPassword) {
                this.errorMessage = 'Please fill in all fields.';
                return;
            }

            if (!isValidEmail(this.username)) {
                this.errorMessage = 'Please enter a valid email address.';
                return;
            }

            if (this.password.length < 8) {
                this.errorMessage = 'Password must be at least 8 characters long.';
                return;
            }

            const hasNumber = /\d/.test(this.password);
            const hasLetter = /[a-zA-Z]/.test(this.password);
            if (!hasNumber || !hasLetter) {
                this.errorMessage = 'Password must contain at least one letter and one number.';
                return;
            }

            if (this.password !== this.confirmPassword) {
                this.errorMessage = 'Passwords do not match.';
                return;
            }

            this.isLoading = true;

            try {
                await waitForSupabase();
                const supabase = window.guitarIoSupabase;
                if (!supabase) {
                    this.errorMessage =
                        'Registration is not configured. Add your Supabase URL and anon key in js/supabase-config.js.';
                    return;
                }

                const email = this.username.toLowerCase().trim();
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password: this.password,
                });

                if (error) {
                    this.errorMessage = error.message || 'Could not create account. Please try again.';
                    return;
                }

                if (data.session) {
                    this.successMessage = 'Account created! Redirecting...';
                    localStorage.removeItem('guitar_io_current_user');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 800);
                } else {
                    this.successMessage =
                        'Check your email to confirm your account, then you can sign in.';
                }
            } catch (error) {
                console.error('Registration error:', error);
                this.errorMessage = 'An error occurred. Please try again.';
            } finally {
                this.isLoading = false;
            }
        },
    };
}

/**
 * Alpine.js component for password recovery form
 */
function recoverForm() {
    return {
        username: '',
        errorMessage: '',
        successMessage: '',
        isLoading: false,

        async handleRecover() {
            this.errorMessage = '';
            this.successMessage = '';

            if (!this.username) {
                this.errorMessage = 'Please enter your email address.';
                return;
            }

            if (!isValidEmail(this.username)) {
                this.errorMessage = 'Please enter a valid email address.';
                return;
            }

            this.isLoading = true;

            try {
                await waitForSupabase();
                const supabase = window.guitarIoSupabase;
                if (!supabase) {
                    this.errorMessage =
                        'Password recovery is not configured. Add your Supabase URL and anon key in js/supabase-config.js.';
                    return;
                }

                const email = this.username.toLowerCase().trim();
                const redirectTo = new URL('reset-password.html', window.location.href).href;

                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo,
                });

                if (error) {
                    this.errorMessage = error.message || 'Could not send recovery email.';
                    return;
                }

                this.successMessage =
                    'If an account exists for that email, you will receive a link to reset your password.';
            } catch (error) {
                console.error('Recovery error:', error);
                this.errorMessage = 'An error occurred. Please try again.';
            } finally {
                this.isLoading = false;
            }
        },
    };
}

/**
 * Alpine.js — set new password after email link (reset-password.html)
 */
function resetPasswordForm() {
    return {
        password: '',
        confirmPassword: '',
        errorMessage: '',
        successMessage: '',
        isLoading: false,
        linkInvalid: false,
        sessionChecked: false,

        async init() {
            await waitForSupabase();
            const supabase = window.guitarIoSupabase;
            if (!supabase) {
                this.linkInvalid = true;
                this.errorMessage =
                    'Supabase is not configured. Add your URL and anon key in js/supabase-config.js.';
                this.sessionChecked = true;
                return;
            }

            let session = null;
            for (let i = 0; i < 8; i++) {
                const {
                    data: { session: s },
                } = await supabase.auth.getSession();
                session = s;
                if (session) {
                    break;
                }
                await new Promise((r) => setTimeout(r, 100));
            }

            if (!session) {
                this.linkInvalid = true;
                this.errorMessage =
                    'This link is invalid or has expired. Use “Forgot password” on the login page to get a new one.';
            }
            this.sessionChecked = true;
        },

        async handleSubmit() {
            this.errorMessage = '';
            this.successMessage = '';

            if (!this.password || !this.confirmPassword) {
                this.errorMessage = 'Please fill in both fields.';
                return;
            }

            if (this.password.length < 8) {
                this.errorMessage = 'Password must be at least 8 characters long.';
                return;
            }

            const hasNumber = /\d/.test(this.password);
            const hasLetter = /[a-zA-Z]/.test(this.password);
            if (!hasNumber || !hasLetter) {
                this.errorMessage = 'Password must contain at least one letter and one number.';
                return;
            }

            if (this.password !== this.confirmPassword) {
                this.errorMessage = 'Passwords do not match.';
                return;
            }

            this.isLoading = true;

            try {
                await waitForSupabase();
                const supabase = window.guitarIoSupabase;
                if (!supabase) {
                    this.errorMessage = 'Sign-in is not configured.';
                    return;
                }

                const { error } = await supabase.auth.updateUser({
                    password: this.password,
                });

                if (error) {
                    this.errorMessage = error.message || 'Could not update password.';
                    return;
                }

                this.successMessage = 'Password updated. Redirecting to the dashboard...';
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1200);
            } catch (error) {
                console.error('Password reset error:', error);
                this.errorMessage = 'An error occurred. Please try again.';
            } finally {
                this.isLoading = false;
            }
        },
    };
}
