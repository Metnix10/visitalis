<?php
require_once 'conexion.php'; //carga la conexion

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { //lee el json
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$datos = json_decode(file_get_contents('php://input'), true); //lee el json de los datos

$nombre     = trim($datos['nombre'] ?? '');
$correo     = trim($datos['correo'] ?? '');
$contrasena = $datos['contrasena'] ?? '';

if ($nombre === '' || $correo === '' || $contrasena === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Todos los campos son obligatorios']);
    exit;
}

if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {                                 //valida los datos
    http_response_code(400);
    echo json_encode(['error' => 'Correo no válido']);
    exit;
}

if (strlen($contrasena) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'La contraseña debe tener al menos 6 caracteres']);
    exit;
}

$conexion = new Conexion();
$db = $conexion->getConexion(); // conecta a la db

if (!$db) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo conectar con la base de datos']);
    exit;
}

try {
    $hash = password_hash($contrasena, PASSWORD_DEFAULT); //hashea la contraseña

    $stmt = $db->prepare('CALL sp_gestion_usuarios(:accion, :id, :nombre, :correo, :contrasena)'); //llama al sp
    $stmt->bindValue(':accion', 'registrar');
    $stmt->bindValue(':id', null, PDO::PARAM_NULL);
    $stmt->bindValue(':nombre', $nombre); // pasa los valores
    $stmt->bindValue(':correo', $correo);
    $stmt->bindValue(':contrasena', $hash);
    $stmt->execute();

    $fila = $stmt->fetch(PDO::FETCH_ASSOC);
    $stmt->closeCursor();

    http_response_code(201);
    echo json_encode($fila);

} catch (PDOException $e) {
    if ($e->getCode() === '45000') {
        http_response_code(409);
        echo json_encode(['error' => 'El correo ya está registrado']);
    } else {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error del servidor', 'detalle' => $e->getMessage()]);
}   
}