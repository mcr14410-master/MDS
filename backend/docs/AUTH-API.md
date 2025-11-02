# Authentication API Documentation

## Overview

The Authentication API provides endpoints for user registration, login, profile management, and password changes using JWT (JSON Web Tokens) for stateless authentication.

## Base URL

```
http://localhost:5000/api/auth
```

## Authentication

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### 1. Register New User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Access:** Public

**Request Body:**

```json
{
  "username": "string (required)",
  "email": "string (required, valid email format)",
  "password": "string (required, min 6 characters)",
  "full_name": "string (optional)"
}
```

**Success Response (201 Created):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "testuser@example.com",
    "full_name": "Test User",
    "created_at": "2025-11-01T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields or invalid input
- `409 Conflict`: Username or email already exists

---

### 2. Login

Authenticate a user and receive a JWT token.

**Endpoint:** `POST /api/auth/login`

**Access:** Public

**Request Body:**

```json
{
  "username": "string (required, can be username or email)",
  "password": "string (required)"
}
```

**Success Response (200 OK):**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "full_name": "Admin User",
    "roles": ["admin"],
    "permissions": ["part.read", "part.create", "program.read", ...]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: User account is disabled

---

### 3. Get Current User Profile

Get the profile of the currently authenticated user.

**Endpoint:** `GET /api/auth/me`

**Access:** Private (requires authentication)

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Success Response (200 OK):**

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "full_name": "Admin User",
    "created_at": "2025-01-15T10:00:00.000Z",
    "last_login": "2025-11-01T14:30:00.000Z",
    "roles": ["admin"],
    "permissions": ["part.read", "part.create", "program.read", ...]
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found

---

### 4. Change Password

Change the password of the currently authenticated user.

**Endpoint:** `POST /api/auth/change-password`

**Access:** Private (requires authentication)

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 6 characters)"
}
```

**Success Response (200 OK):**

```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields or password too short
- `401 Unauthorized`: Current password is incorrect
- `404 Not Found`: User not found

---

## JWT Token

### Token Lifetime

The JWT token expires after **24 hours** by default (configurable via `JWT_EXPIRES_IN` in `.env`).

### Token Payload

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "iat": 1730462400,
  "exp": 1730548800
}
```

### Using the Token

Include the token in the Authorization header for protected endpoints:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Default Test User

A default admin user is created during database seeding:

- **Username:** `admin`
- **Password:** `admin123`
- **Email:** `admin@example.com`
- **Roles:** admin (with all permissions)

---

## Security Features

1. **Password Hashing:** Passwords are hashed using bcrypt with salt rounds
2. **JWT Tokens:** Stateless authentication using JSON Web Tokens
3. **Token Validation:** Tokens are verified on every protected request
4. **User Status Check:** Inactive users cannot log in
5. **Password Strength:** Minimum 6 characters required

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common HTTP Status Codes:

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server error

---

## Testing with cURL

### Register

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "test123456",
    "full_name": "Test User"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### Get Profile

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Change Password

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "newpassword123"
  }'
```

---

## Next Steps

After implementing authentication, the next features to add are:

1. **User Management Endpoints** (CRUD for users - admin only)
2. **Bauteile (Parts) CRUD Endpoints** with authentication
3. **Role & Permission Middleware** for fine-grained access control
4. **Audit Log Middleware** to track all API actions

---

## Environment Variables

Required environment variables in `.env`:

```env
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
```

---

**Phase 1, Week 2 - Authentication Implementation Complete! ✅**
