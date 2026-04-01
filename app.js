let paquetesEscaneados = [];
let registrosAcumulados = [];

// Esperar a que productos_db.js cargue
if (typeof paquetesDB === 'undefined') {
    document.getElementById('loadingMsg').innerHTML = '❌ Error: No se pudo cargar la base de datos de productos.<br>Contacta al administrador.';
} else {
    inicializarSistema();
}

function inicializarSistema() {
    document.getElementById('loadingMsg').style.display = 'none';
    document.getElementById('scannerSection').style.display = 'block';
    document.getElementById('formularioSalida').style.display = 'block';
    
    const scanner = new Html5QrcodeScanner('reader', { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
    });
    scanner.render(onScanSuccess);
    
    console.log('✅ Sistema inicializado. Productos disponibles:', Object.keys(paquetesDB).length);
}

function onScanSuccess(decodedText) {
    const paquete = paquetesDB[decodedText];
    
    if (!paquete) {
        alert("❌ Código no encontrado: " + decodedText);
        return;
    }
    
    if (paquete.unidadesActuales === 0) {
        alert("⚠️ Paquete vacío: " + paquete.producto);
        return;
    }
    
    const yaEscaneado = paquetesEscaneados.find(p => p.codigoQR === decodedText);
    if (yaEscaneado) {
        alert("⚠️ Este paquete ya fue escaneado");
        return;
    }
    
    paquetesEscaneados.push({
        idPaquete: paquete.idPaquete,
        codigoQR: paquete.codigoQR,
        producto: paquete.producto,
        marca: paquete.marca,
        capacidad: paquete.capacidad,
        disponible: paquete.unidadesActuales,
        cantidadASacar: 0
    });
    
    actualizarListaPaquetes();
}

function actualizarListaPaquetes() {
    const container = document.getElementById('paquetesContainer');
    const lista = document.getElementById('listaPaquetes');
    
    if (paquetesEscaneados.length === 0) {
        container.style.display = 'none';
        document.getElementById('btnRegistrar').disabled = true;
        return;
    }
    
    container.style.display = 'block';
    document.getElementById('btnRegistrar').disabled = false;
    
    lista.innerHTML = paquetesEscaneados.map((p, index) => `
        <div class="paquete-item">
            <div class="paquete-header">
                <div>
                    <div class="paquete-nombre">${p.producto} - ${p.marca}</div>
                    <div class="paquete-codigo">Código: ${p.codigoQR} | ID: ${p.idPaquete}</div>
                </div>
                <button type="button" class="btn-eliminar" onclick="eliminarPaquete(${index})">🗑️ Quitar</button>
            </div>
            
            <div class="paquete-disponible">
                📦 Disponibles en este paquete: ${p.disponible} unidades
            </div>
            
            <div class="cantidad-grupo">
                <label class="cantidad-label">¿Cuántas unidades vas a sacar?</label>
                <input type="number" 
                       class="cantidad-input" 
                       value="${p.cantidadASacar}" 
                       min="0" 
                       max="${p.disponible}" 
                       onchange="actualizarCantidad(${index}, this.value)"
                       placeholder="Ingresa cantidad">
            </div>
        </div>
    `).join('');
}

function actualizarCantidad(index, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad) || 0;
    const paquete = paquetesEscaneados[index];
    
    if (cantidad > paquete.disponible) {
        alert("⚠️ No puedes sacar más de " + paquete.disponible + " unidades de este paquete");
        actualizarListaPaquetes();
        return;
    }
    
    paquetesEscaneados[index].cantidadASacar = cantidad;
}

function eliminarPaquete(index) {
    paquetesEscaneados.splice(index, 1);
    actualizarListaPaquetes();
}

document.getElementById('formularioSalida').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const paquetesSinCantidad = paquetesEscaneados.filter(p => p.cantidadASacar === 0);
    if (paquetesSinCantidad.length > 0) {
        document.getElementById('alertWarning').textContent = "⚠️ Algunos paquetes no tienen cantidad especificada.";
        document.getElementById('alertWarning').style.display = "block";
        setTimeout(() => document.getElementById('alertWarning').style.display = "none", 4000);
        return;
    }
    
    const datos = {
        fecha: new Date().toLocaleDateString('es-GT'),
        hora: new Date().toLocaleTimeString('es-GT'),
        nombre: document.getElementById('nombre').value,
        puesto: document.getElementById('puesto').value,
        ubicacion: document.getElementById('ubicacion').value,
        tipoEvento: document.getElementById('tipoEvento').value,
        comentarios: document.getElementById('comentarios').value,
        paquetes: paquetesEscaneados.filter(p => p.cantidadASacar > 0)
    };
    
    registrosAcumulados.push(datos);
    
    const totalUnidades = datos.paquetes.reduce((sum, p) => sum + p.cantidadASacar, 0);
    
    document.getElementById('alertSuccess').textContent = "✅ Salida registrada: " + totalUnidades + " unidades";
    document.getElementById('alertSuccess').style.display = "block";
    document.getElementById('btnDescargar').style.display = "block";
    
    setTimeout(() => {
        this.reset();
        paquetesEscaneados = [];
        actualizarListaPaquetes();
        document.getElementById('alertSuccess').style.display = "none";
    }, 3000);
});

document.getElementById('btnDescargar').addEventListener('click', function() {
    let csv = "Fecha|Hora|Responsable|Puesto|Tipo_Movimiento|ID_Paquete|Codigo_QR|Producto|Marca|Capacidad|Cantidad|Ubicacion|Actividad|Comentarios\n";
    
    registrosAcumulados.forEach(r => {
        r.paquetes.forEach(p => {
            csv += ${r.fecha}|${r.hora}|${r.nombre}|${r.puesto}|SALIDA|${p.idPaquete}|${p.codigoQR}|${p.producto}|${p.marca}|${p.capacidad}|${p.cantidadASacar}|${r.ubicacion}|${r.tipoEvento}|${r.comentarios}\n;
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'salidas_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
});