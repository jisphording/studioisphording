<?php
require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();
echo "Kirby version: " . $kirby->version() . "\n";
echo "Site methods available:\n";

$methods = get_class_methods($kirby->site());
foreach ($methods as $method) {
    if (strpos($method, 'get') === 0 || strpos($method, 'display') === 0 || strpos($method, 'pull') === 0) {
        echo "  - " . $method . "\n";
    }
}

echo "\nChecking specific methods:\n";
echo "getResponsiveImage exists: " . (method_exists($kirby->site(), 'getResponsiveImage') ? 'YES' : 'NO') . "\n";
echo "getThumbnail exists: " . (method_exists($kirby->site(), 'getThumbnail') ? 'YES' : 'NO') . "\n";
echo "pullRelatedPages exists: " . (method_exists($kirby->site(), 'pullRelatedPages') ? 'YES' : 'NO') . "\n";
echo "displayShowcase exists: " . (method_exists($kirby->site(), 'displayShowcase') ? 'YES' : 'NO') . "\n";

// Check if plugins are loaded
echo "\nPlugins loaded:\n";
foreach ($kirby->plugins() as $name => $plugin) {
    echo "  - " . $name . "\n";
}
?>
