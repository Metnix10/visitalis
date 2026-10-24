<?php
session_start();
require_once 'conexion.php'; //carga la conexion

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { //valida que el metodo sea post
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$datos = json_decode(file_get_contents('php://input'), true); //lee el json mandado por el html

$correo     = trim($datos['correo'] ?? ''); 
$contrasena = $datos['contrasena'] ?? '';

if ($correo === '' || $contrasena === '') { //valida los datos si falta algo responde con 400
    http_response_code(400);
    echo json_encode(['error' => 'Todos los campos son obligatorios']);
    exit;
}

$conexion = new Conexion();
$db = $conexion->getConexion(); //se conecta a la db

if (!$db) { // si falla la conexion
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo conectar con la base de datos']);
    exit;
}

try {
    $stmt = $db->prepare('CALL sp_gestion_usuarios(:accion, :id, :nombre, :correo, :contrasena)'); //llama al sp
    $stmt->bindValue(':accion', 'iniciar_sesion');
    $stmt->bindValue(':id', null, PDO::PARAM_NULL); //pasan los valores
    $stmt->bindValue(':nombre', null, PDO::PARAM_NULL);
    $stmt->bindValue(':correo', $correo);
    $stmt->bindValue(':contrasena', null, PDO::PARAM_NULL);
    $stmt->execute();

    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
    $stmt->closeCursor();

    // Mismo mensaje si el correo no existe o la contraseña es incorrecta
    if (!$usuario || !password_verify($contrasena, $usuario['hash_contrasena'])) { 
        http_response_code(401);
        echo json_encode(['error' => 'Correo o contraseña incorrectos']);
        exit;
    }

    session_regenerate_id(true);
    $_SESSION['id_usuario'] = $usuario['id_usuario']; //guarda los datos en session
    $_SESSION['nombre']     = $usuario['nombre'];
    $_SESSION['correo']     = $usuario['correo'];

    echo json_encode([
        'mensaje'    => 'Sesión iniciada',
        'id_usuario' => $usuario['id_usuario'],
        'nombre'     => $usuario['nombre']
    ]);

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