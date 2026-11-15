$ErrorActionPreference = 'Stop'

$gradleCache = "C:\Users\hp\.gradle\caches\modules-2\files-2.1"
$jars = (Get-ChildItem -Path $gradleCache -Filter "*.jar" -Recurse).FullName
$cp = $jars -join ";"

$buildDir = "minecraft-plugin/EvolutionLeaderboard/build/classes"
$distDir = "minecraft-plugin/EvolutionLeaderboard/dist"

if (Test-Path $buildDir) {
    Remove-Item -Recurse -Force $buildDir
}
New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

$javaFiles = (Get-ChildItem -Path "minecraft-plugin/EvolutionLeaderboard/src/main/java" -Filter "*.java" -Recurse).FullName
Write-Host "Compiling $($javaFiles.Count) Java source files with release 21..."

& javac -encoding UTF-8 --release 21 -cp $cp -d $buildDir $javaFiles

Write-Host "Compilation successful!"

# Copy resources
Copy-Item "minecraft-plugin/EvolutionLeaderboard/src/main/resources/plugin.yml" "$buildDir/plugin.yml"
Copy-Item "minecraft-plugin/EvolutionLeaderboard/src/main/resources/config.yml" "$buildDir/config.yml"

# Package into JAR
$targetJar = "$distDir/EvolutionLeaderboard-1.0.0.jar"
if (Test-Path $targetJar) {
    Remove-Item -Force $targetJar
}

Write-Host "Packaging JAR into $targetJar..."
Set-Location $buildDir
& jar cvf "../../dist/EvolutionLeaderboard-1.0.0.jar" *
Set-Location "../../../.."

Write-Host "Build complete! Output: $targetJar"
