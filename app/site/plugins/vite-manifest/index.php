<?php

/**
 * Vite Manifest Helper Plugin
 * Reads the Vite manifest file and provides helpers for loading assets
 */

function getViteManifest() {
    static $manifest = null;
    
    if ($manifest === null) {
        $manifestPath = kirby()->root('assets') . '/bundle/.vite/manifest.json';
        
        if (file_exists($manifestPath)) {
            $manifestContent = file_get_contents($manifestPath);
            $manifest = json_decode($manifestContent, true);
        } else {
            $manifest = [];
        }
    }
    
    return $manifest;
}

function getViteAssetUrl($entry) {
    $manifest = getViteManifest();
    
    if (isset($manifest[$entry]['file'])) {
        return url('assets/bundle/' . $manifest[$entry]['file']);
    }
    
    return null;
}

function getViteDynamicImports($entry) {
    $manifest = getViteManifest();
    $imports = [];
    
    if (isset($manifest[$entry]['dynamicImports'])) {
        foreach ($manifest[$entry]['dynamicImports'] as $import) {
            if (isset($manifest[$import]['file'])) {
                $imports[] = url('assets/bundle/' . $manifest[$import]['file']);
            }
        }
    }
    
    return $imports;
}

function vitePreloadLinks($entry) {
    $dynamicImports = getViteDynamicImports($entry);
    $html = '';
    
    foreach ($dynamicImports as $importUrl) {
        $html .= '<link rel="modulepreload" href="' . $importUrl . '">' . "\n";
    }
    
    return $html;
}

// Register Kirby helper functions
Kirby::plugin('studioisphording/vite-manifest', [
    'options' => [
        'cache' => true
    ]
]);
