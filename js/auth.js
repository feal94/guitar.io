// guitar.io - Authentication Module with Alpine.js

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
                this.errorMessage = 'Please enter both username and password.';
                return;
            }
            
            // Show loading state
            this.isLoading = true;
            
            // Simulate network delay for demonstration
            await new Promise(resolve => setTimeout(resolve, 500));
            
            try {
                // Get stored users from localStorage
                const users = JSON.parse(localStorage.getItem('guitar_io_users') || '{}');
                
                // Check if user exists
                if (!users[this.username]) {
                    this.errorMessage = 'Username not found. Please register first.';
                    return;
                }
                
                // Verify password (in real app, this would be hashed)
                if (users[this.username].password !== this.password) {
                    this.errorMessage = 'Incorrect password. Please try again.';
                    return;
                }
                
                // Successful login
                const currentUser = {
                    username: this.username,
                    loginTime: new Date().toISOString()
                };
                
                localStorage.setItem('guitar_io_current_user', JSON.stringify(currentUser));
                
                // Redirect to dashboard (TODO: create dashboard page)
                console.log('Login successful!', currentUser);
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
            
            // Validate username length
            if (this.username.length < 3) {
                this.errorMessage = 'Username must be at least 3 characters long.';
                return;
            }
            
            // Validate password length
            if (this.password.length < 6) {
                this.errorMessage = 'Password must be at least 6 characters long.';
                return;
            }
            
            // Check if passwords match
            if (this.password !== this.confirmPassword) {
                this.errorMessage = 'Passwords do not match.';
                return;
            }
            
            // Show loading state
            this.isLoading = true;
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            try {
                // Get existing users
                const users = JSON.parse(localStorage.getItem('guitar_io_users') || '{}');
                
                // Check if username already exists
                if (users[this.username]) {
                    this.errorMessage = 'Username already exists. Please choose another.';
                    return;
                }
                
                // Store new user (NOTE: In production, passwords should be hashed!)
                users[this.username] = {
                    password: this.password,
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
                this.errorMessage = 'Please enter your username.';
                return;
            }
            
            // Show loading state
            this.isLoading = true;
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            try {
                // Get existing users
                const users = JSON.parse(localStorage.getItem('guitar_io_users') || '{}');
                
                // Check if username exists
                if (!users[this.username]) {
                    this.errorMessage = 'Username not found. Please check and try again.';
                    return;
                }
                
                // In a real app, this would send a recovery email
                // For this demo, we'll just show the password (NOT secure!)
                const recoveredPassword = users[this.username].password;
                
                this.successMessage = `Your password is: ${recoveredPassword}`;
                
            } catch (error) {
                console.error('Recovery error:', error);
                this.errorMessage = 'An error occurred. Please try again.';
            } finally {
                this.isLoading = false;
            }
        }
    };
}

