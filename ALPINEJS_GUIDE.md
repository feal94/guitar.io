# Alpine.js Integration Guide

This document explains how Alpine.js is integrated into guitar.io and provides examples for future development.

## What is Alpine.js?

Alpine.js is a lightweight JavaScript framework that allows you to add interactivity directly in your HTML. Think of it as "Django template tags for JavaScript" - you add special attributes to your HTML elements to make them reactive.

## How We're Using It

### 1. **Loading Alpine.js**

Added to the `<head>` of all pages:
```html
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js"></script>
```

### 2. **Alpine.js Components**

We define reusable components as JavaScript functions in `js/auth.js`:

- `loginForm()` - Handles login functionality
- `registerForm()` - Handles registration
- `recoverForm()` - Handles password recovery

### 3. **Alpine.js Directives (Special Attributes)**

#### `x-data` - Initialize a component
```html
<div x-data="loginForm()">
  <!-- This div now has access to all data and methods from loginForm() -->
</div>
```

#### `x-model` - Two-way data binding
```html
<input x-model="username">
<!-- This input is automatically synced with the 'username' variable -->
```

#### `@submit.prevent` - Handle form submission
```html
<form @submit.prevent="handleLogin">
  <!-- Prevents default form submission and calls handleLogin() -->
</form>
```

#### `x-show` - Show/hide elements
```html
<div x-show="errorMessage">
  <!-- Only shown when errorMessage has a value -->
</div>
```

#### `x-text` - Display text content
```html
<span x-text="errorMessage"></span>
<!-- Displays the value of errorMessage -->
```

#### `:disabled` - Bind attributes
```html
<button :disabled="isLoading">
  <!-- Button is disabled when isLoading is true -->
</button>
```

#### `x-transition` - Smooth animations
```html
<div x-show="errorMessage" x-transition>
  <!-- Fades in/out smoothly -->
</div>
```

## Example: Login Form Component

```javascript
function loginForm() {
    return {
        // Component state (variables)
        username: '',
        password: '',
        errorMessage: '',
        isLoading: false,
        
        // Component methods (functions)
        async handleLogin() {
            this.errorMessage = '';
            this.isLoading = true;
            
            // Your logic here
            
            this.isLoading = false;
        }
    };
}
```

## Benefits Over Vanilla JavaScript

### Before (Vanilla JS):
```javascript
const form = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const errorDiv = document.getElementById('error');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value;
    errorDiv.textContent = 'Error message';
    errorDiv.style.display = 'block';
});
```

### After (Alpine.js):
```html
<div x-data="{ username: '', error: '' }">
    <form @submit.prevent="handleSubmit">
        <input x-model="username">
        <div x-show="error" x-text="error"></div>
    </form>
</div>
```

Much cleaner and easier to read!

## Authentication System

### How It Works

1. **Registration** (`register.html`)
   - User enters username and password
   - System validates inputs (length, matching passwords)
   - Stores user in `localStorage` under key `guitar_io_users`
   - Redirects to login page

2. **Login** (`index.html`)
   - User enters credentials
   - System checks against stored users
   - If valid, stores session in `guitar_io_current_user`
   - Ready to redirect to dashboard (coming soon)

3. **Password Recovery** (`recover.html`)
   - User enters username
   - System retrieves password from localStorage
   - Displays password (Demo only - not secure!)

### Data Storage

All data is stored in browser's `localStorage`:

- `guitar_io_users` - Object containing all registered users
- `guitar_io_current_user` - Currently logged in user session

Example structure:
```javascript
// guitar_io_users
{
    "john_doe": {
        "password": "mypassword123",
        "createdAt": "2025-12-26T10:30:00.000Z"
    }
}

// guitar_io_current_user
{
    "username": "john_doe",
    "loginTime": "2025-12-26T11:00:00.000Z"
}
```

## Creating New Alpine Components

When adding new features, follow this pattern:

1. **Create the component function** in appropriate JS file:
```javascript
function myNewComponent() {
    return {
        // State variables
        myData: '',
        
        // Methods
        myMethod() {
            // Do something
        }
    };
}
```

2. **Use in HTML**:
```html
<div x-data="myNewComponent()">
    <input x-model="myData">
    <button @click="myMethod()">Click Me</button>
</div>
```

## Tips for Development

1. **Keep components small** - Each component should do one thing well
2. **Use descriptive names** - `handleLogin` is better than `submit`
3. **Validate inputs** - Always check user input before processing
4. **Show feedback** - Use loading states and error messages
5. **Check the console** - Alpine.js errors appear in browser console

## Next Steps

- Create dashboard page with Alpine.js components
- Add more complex interactions (guitar chord display, practice tracking, etc.)
- Build reusable components for common UI patterns

## Resources

- [Alpine.js Official Documentation](https://alpinejs.dev/)
- [Alpine.js Examples](https://alpinejs.dev/examples)

