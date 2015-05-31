<?php

if(!isset($_GET['app']))
	die('Missing application name');

$app = $_GET['app'];

if($app !== preg_replace('#^([^a-zA-Z0-9_\- ]+)$#', '', $app))
	die('Invalid application name');

$file = 'apps/' . $app . '.app';

if(!file_exists($file) || !is_file($file))
	die('Application not found');

readfile($file);

?>
