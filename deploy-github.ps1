# Deploy to GitHub (PowerShell)
# Usage: .\deploy-github.ps1 [repository-url]
# Example: .\deploy-github.ps1 https://github.com/bolajil/rady-genai.git

param(
    [string]$RepoUrl = ""
)

$GITHUB_USERNAME = "bolajil"

Write-Host "========================================"
Write-Host "  Deploy to GitHub"
Write-Host "========================================"
Write-Host ""

# Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install Git first."
    exit 1
}

# Initialize Git if not already initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..."
    git init
    git branch -M main
}

# Add .gitignore
if (-not (Test-Path ".gitignore")) {
    Write-Host "❌ .gitignore not found. Please ensure .gitignore is created."
    exit 1
}

# Show files that will be committed
Write-Host ""
Write-Host "Files to be committed (checking .gitignore exclusions)..."
git add -n .
Write-Host ""

# Verify .md files are excluded (except README.md)
$mdFiles = git ls-files --others --exclude-standard | Select-String "\.md$"
if ($mdFiles) {
    Write-Host "⚠️  Warning: The following .md files will be included:"
    $mdFiles
    Write-Host ""
    $confirm = Read-Host "Are you sure you want to continue? (y/n)"
    if ($confirm -ne "y") {
        Write-Host "Deployment cancelled."
        exit 0
    }
}

# Add files
Write-Host "Adding files..."
git add .

# Commit
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Deploy Rady Children's GenAI Agent"
}

Write-Host "Committing..."
git commit -m "$commitMessage"

# Add remote if provided
if ($RepoUrl) {
    Write-Host ""
    Write-Host "Adding remote repository..."
    git remote remove origin 2>$null
    git remote add origin $RepoUrl
}
elseif (-not (git remote | Select-String "origin")) {  
    $defaultRepo = "https://github.com/${GITHUB_USERNAME}/rady-genai.git"
    Write-Host ""
    Write-Host "No repository URL provided."
    $useDefault = Read-Host "Use default: $defaultRepo ? (y/n)"
    
    if ($useDefault -eq "y") {
        $RepoUrl = $defaultRepo
        git remote add origin $RepoUrl
    }
    else {
        $RepoUrl = Read-Host "Enter GitHub repository URL"
        git remote add origin $RepoUrl
    }
}

# Push to GitHub
Write-Host ""
Write-Host "Pushing to GitHub..."
git push -u origin main

Write-Host ""
Write-Host "========================================"
Write-Host "  ✅ Successfully deployed to GitHub!"
Write-Host "========================================"
Write-Host ""
Write-Host "Repository: $RepoUrl"
Write-Host ""
Write-Host "To clone:"
Write-Host "  git clone $RepoUrl"
Write-Host ""
