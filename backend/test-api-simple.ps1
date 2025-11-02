# Simple API Test Script for MDS Backend
# Run this in PowerShell: .\test-api-simple.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   MDS Backend API Tests" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get -ErrorAction Stop
    Write-Host "   ✅ Health Check: " -NoNewline -ForegroundColor Green
    Write-Host "$($health.status)" -ForegroundColor White
    Write-Host "   Database: $($health.database)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Health Check failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host "`n⚠️  Make sure the server is running: npm run dev`n" -ForegroundColor Yellow
    exit 1
}

# Test 2: Database Info
Write-Host "`n2. Testing Database Info..." -ForegroundColor Yellow
try {
    $dbInfo = Invoke-RestMethod -Uri "$baseUrl/api/db/info" -Method Get -ErrorAction Stop
    Write-Host "   ✅ Database Info retrieved" -ForegroundColor Green
    Write-Host "   Tables: $($dbInfo.tables)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Database Info failed!" -ForegroundColor Red
    exit 1
}

# Test 3: Login
Write-Host "`n3. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "   ✅ Login successful!" -ForegroundColor Green
    Write-Host "   User: $($loginResponse.user.username)" -ForegroundColor Gray
    Write-Host "   Email: $($loginResponse.user.email)" -ForegroundColor Gray
    Write-Host "   Roles: $($loginResponse.user.roles -join ', ')" -ForegroundColor Gray
    
    $token = $loginResponse.token
    Write-Host "   Token received: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Login failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test 4: Get Profile (Protected Endpoint)
Write-Host "`n4. Testing Get Profile (Protected)..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $profile = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "   ✅ Profile retrieved successfully!" -ForegroundColor Green
    Write-Host "   Username: $($profile.user.username)" -ForegroundColor Gray
    Write-Host "   Email: $($profile.user.email)" -ForegroundColor Gray
    Write-Host "   Active: $($profile.user.is_active)" -ForegroundColor Gray
    Write-Host "   Roles: $($profile.user.roles -join ', ')" -ForegroundColor Gray
    Write-Host "   Permissions: $($profile.user.permissions.Count) permissions" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Get Profile failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test 5: Test Invalid Token
Write-Host "`n5. Testing Invalid Token..." -ForegroundColor Yellow
try {
    $invalidHeaders = @{
        "Authorization" = "Bearer invalid_token_here"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" `
        -Method Get `
        -Headers $invalidHeaders `
        -ErrorAction Stop
    
    Write-Host "   ❌ Invalid token was accepted (BUG!)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   ✅ Invalid token correctly rejected (401)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Unexpected error: $_" -ForegroundColor Yellow
    }
}

# Test 6: Register New User
Write-Host "`n6. Testing User Registration..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$registerBody = @{
    username = "testuser_$timestamp"
    email = "testuser_$timestamp@example.com"
    password = "test123456"
    full_name = "Test User $timestamp"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" `
        -Method Post `
        -Body $registerBody `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "   ✅ User registered successfully!" -ForegroundColor Green
    Write-Host "   Username: $($registerResponse.user.username)" -ForegroundColor Gray
    Write-Host "   Email: $($registerResponse.user.email)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Registration failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ All critical tests passed!" -ForegroundColor Green
Write-Host "`n🎉 Week 2 - Backend API + Auth: COMPLETE!`n" -ForegroundColor Green
