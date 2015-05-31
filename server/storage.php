<?php

// example :
// http://localhost/NearOS/server/storage.php?request={"password":"f56a2e7b962b277fd2c51966b6d94cea","type":"storage_event","name":"makeDirectory","path":"sys","content":""}

if(!isset($_POST['request'])) {
  die('missing request');
}

$r = json_decode($_POST['request']);

if(!$r) {
  die('bad request');
}

if(!isset($r->password)) {
  die('missing password');
}

if(!isset($r->type)) {
  die('missing action type');
}

if($r->password !== 'f56a2e7b962b277fd2c51966b6d94cea') {
  die('wrong password');
}

if($r->type === 'get_storage') {
  die(file_get_contents('storage.dat'));
} elseif($r->type === 'storage_event') {
  if(!isset($r->name)) die('missing action name');
  if(!isset($r->path)) die('missing action path');
  if(!isset($r->content)) die('missing action content');
  if(!is_string($r->name)) die('invalid name');
  if(!is_string($r->path)) die('invalid path');

  if(preg_replace('#(\r|\n|\r\n|"|\'|<|>)#', '', $r->path) !== $r->path) die('invalid action path');

  $success = true;
  $name = $r->name;
  $path = $r->path;
  $a = explode('/', $path);
  $f = '$s["data"]["' . str_replace('/', '"]["', $path) . '"]';
  $t = '$s["streams"]["' . $path . '"]';
  $content = $r->content;

  $s = json_decode(file_get_contents('storage.dat'), true);

  //die('[' . $name . '] ' . $path);

  switch($name) {
    case 'writeFile':
      if(!is_string($content)) die('writefile content must be a string');
      eval($f . ' = $content;');
      break;

    case 'removeFile':
    case 'removeDirectory':
      eval('unset(' . $f . ');');
      break;

    case 'makeDirectory':
      eval($f . ' = new stdClass();');
      break;

    case 'createStream':
      eval($t . ' = array();');
      break;

    case 'publishStream':
      eval($t . '[] = $content;');
      break;

    case 'removeStream':
      eval('delete ' . $t);
      break;

    case 'clear':
      $s = array(
        'streams' => array(),
        'data' => array()
      );
      break;

    case 'setAll':
      $s = $content;
      $success = true;
      break;

    default:
      die('Unknown action : ' . $name);
      $success = false;
      break;
  }

  if($success) {
    file_put_contents('storage.dat', json_encode($s, JSON_FORCE_OBJECT));
    die('true');
  } else {
    die('false');
  }

}

?>