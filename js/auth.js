// guitar.io - Authentication Module with Alpine.js

/**
 * Hash a string using SHA-256
 * @param {string} message - The string to hash
 * @returns {Promise<string>} Hex string of the hash
 */
async function sha256Hash(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Alpine.js component for login form
 */
function loginForm() {
    return {
        username: '',
        password: '',
        errorMessage: '',
        isLoading: false,
        
        /**
         * Handle login form submission
         */
        async handleLogin() {
            // Clear previous errors
            this.errorMessage = '';
            
            // Validate inputs
            if (!this.username || !this.password) {
                this.errorMessage = 'Please enter both email and password.';
                return;
            }
            
            // Validate email format
            if (!isValidEmail(this.username)) {
                this.errorMessage = 'Please enter a valid email address.';
                return;
            }
            
            // Show loading state
            this.isLoading = true;
            
            try {
                // Hash the email to use as lookup key
                const emailHash = await sha256Hash(this.username.toLowerCase().trim());
                
                // Get stored users from localStorage
                const users = JSON.parse(localStorage.getItem('guitar_io_users') || '{}');
                
                // Check if user exists (by hashed email)
                if (!users[emailHash]) {
                    this.errorMessage = 'Email not found. Please register first.';
                    return;
                }
                
                // Hash the entered password
                const passwordHash = await sha256Hash(this.password);
                
                // Verify password hash
                if (users[emailHash].passwordHash !== passwordHash) {
                    this.errorMessage = 'Incorrect password. Please try again.';
                    return;
                }
                
                // Successful login - store session with original (unhashed) email for display
                const currentUser = {
                    email: this.username.toLowerCase().trim(),
                    emailHash: emailHash,
                    loginTime: new Date().toISOString()
                };
                
                localStorage.setItem('guitar_io_current_user', JSON.stringify(currentUser));
                
                // Redirect to dashboard (TODO: create dashboard page)
                console.log('Login successful!', { email: currentUser.email });
                alert('Login successful! (Dashboard coming soon)');
                
            } catch (error) {
                console.error('Login error:', error);
                this.errorMessage = 'An error occurred. Please try again.';
            } finally {
                this.isLoading = false;
            }
        }
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
        
        /**
         * Handle registration form submission
         */
        async handleRegister() {
            // Clear previous messages
            this.errorMessage = '';
            this.successMessage = '';
            
            // Validate inputs
            if (!this.username || !this.password || !this.confirmPassword) {
                this.errorMessage = 'Please fill in all fields.';
                return;
            }
            
            // Validate email format
            if (!isValidEmail(this.username)) {
                this.errorMessage = 'Please enter a valid email address.';
                return;
            }
            
            // Validate password length
            if (this.password.length < 8) {
                this.errorMessage = 'Password must be at least 8 characters long.';
                return;
            }
            
            // Check password strength (at least one number and one letter)
            const hasNumber = /\d/.test(this.password);
            const hasLetter = /[a-zA-Z]/.test(this.password);
            if (!hasNumber || !hasLetter) {
                this.errorMessage = 'Password must contain at least one letter and one number.';
                return;
            }
            
            // Check if passwords match
            if (this.password !== this.confirmPassword) {
                this.errorMessage = 'Passwords do not match.';
                return;
            }
            
            // Show loading state
            this.isLoading = true;
            
            try {
                // Normalize email
                const email = this.username.toLowerCase().trim();
                
                // Hash the email and password
                const emailHash = await sha256Hash(email);
                const passwordHash = await sha256Hash(this.password);
                
                // Get existing users
                const users = JSON.parse(localStorage.getItem('guitar_io_users') || '{}');
                
                // Check if email already exists (by hash)
                if (users[emailHash]) {
                    this.errorMessage = 'This email is already registered. Please login instead.';
                    return;
                }
                
                // Store new user with hashed values
                users[emailHash] = {
                    emailHash: emailHash,
                    passwordHash: passwordHash,
                    createdAt: new Date().toISOString()
                };
                
                localStorage.setItem('guitar_io_users', JSON.stringify(users));
                
                // Show success message
                this.successMessage = 'Account created successfully! Redirecting to login...';
                
                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                
            } catch (error) {
                console.error('Registration error:', error);
                this.errorMessage = 'An error occurred. Please try again.';
            } finally {
                this.isLoading = false;
            }
        }
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
        
        /**
         * Handle password recovery form submission
         */
        async handleRecover() {
            // Clear previous messages
            this.errorMessage = '';
            this.successMessage = '';
            
            // Validate input
            if (!this.username) {
                this.errorMessage = 'Please enter your email address.';
                return;
            }
            
            // Validate email format
            if (!isValidEmail(this.username)) {
                this.errorMessage = 'Please enter a valid email address.';
                return;
            }
            
            // Show loading state
            this.isLoading = true;
            
            try {
                // Normalize and hash email
                const email = this.username.toLowerCase().trim();
                const emailHash = await sha256Hash(email);
                
                // Get existing users
                const users = JSON.parse(localStorage.getItem('guitar_io_users') || '{}');
                
                // Check if email exists (by hash)
                if (!users[emailHash]) {
                    this.errorMessage = 'Email not found. Please check and try again.';
                    return;
                }
                
                // In a real app with a backend, this would:
                // 1. Generate a secure recovery token
                // 2. Store it temporarily (with expiration)
                // 3. Send an email with a recovery link
                //
                // For this static site demo, we'll simulate success
                this.successMessage = `A password recovery link has been sent to ${email}. Please check your email.`;
                
                // Note: Since we're storing hashed passwords, we cannot retrieve them
                // In a real system, the user would click a link to reset their password
                
                console.log('Password recovery requested for:', email);
                
            } catch (error) {
                console.error('Recovery error:', error);
                this.errorMessage = 'An error occurred. Please try again.';
            } finally {
                this.isLoading = false;
            }
        }
    };
}
