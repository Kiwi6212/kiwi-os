$files = @(
    "apps\web\app\job-search\page.tsx",
    "apps\web\app\portfolio\page.tsx",
    "apps\web\components\finance\finances-client.tsx",
    "apps\web\components\portfolio\project-form-modal.tsx",
    "apps\web\components\portfolio\projects-tab.tsx",
    "apps\web\components\settings\data-tab.tsx",
    "apps\web\components\settings\integrations-tab.tsx",
    "apps\web\components\application-list-client.tsx",
    "apps\web\components\finance-stats-client.tsx",
    "apps\web\components\stats-client.tsx",
    "apps\web\components\task-list-client.tsx",
    "apps\web\components\weather-card.tsx"
)

foreach ($file in $files) {
    $fullPath = Join-Path "C:\dev\kiwi-os" $file
    if (-not (Test-Path $fullPath)) {
        Write-Host "SKIP: $file (not found)" -ForegroundColor Yellow
        continue
    }
    
    $content = Get-Content $fullPath -Raw
    
    # Skip s'il a déjà l'import authFetch
    $hasImport = $content -match 'from\s+["'']@/lib/auth-fetch["'']'
    
    # Remplacer fetch( par authFetch( (sauf "authFetch(" déjà présent)
    # Le regex utilise un negative lookbehind pour ne pas matcher authFetch
    $newContent = $content -replace '(?<!auth)\bfetch\(', 'authFetch('
    
    # Ajouter l'import si pas déjà là ET si du remplacement a eu lieu
    if (-not $hasImport -and ($newContent -ne $content)) {
        # Détecter "use client" pour insérer après si présent
        if ($newContent -match '"use client";\s*[\r\n]') {
            $newContent = $newContent -replace '("use client";\s*[\r\n]+)', "`$1import { authFetch } from `"@/lib/auth-fetch`";`r`n"
        } else {
            $newContent = "import { authFetch } from `"@/lib/auth-fetch`";`r`n" + $newContent
        }
    }
    
    if ($newContent -ne $content) {
        Set-Content -Path $fullPath -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "MIGRATED: $file" -ForegroundColor Green
    } else {
        Write-Host "NO CHANGE: $file" -ForegroundColor Gray
    }
}

Write-Host "`nDone. Re-running audit..." -ForegroundColor Cyan