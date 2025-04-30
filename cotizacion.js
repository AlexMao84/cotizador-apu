function agregarItemCotizacion() {
    try {
        const tabla = document.getElementById('tablaItemsCotizacion').getElementsByTagName('tbody')[0];
        const newRow = tabla.insertRow();
        newRow.innerHTML = `
            <td><input type="text" class="editable descripcion" value="Nuevo Ítem" required></td>
            <td><select class="editable unidad">
                <option value="UND">UND</option>
                <option value="M2">M2</option>
                <option value="ML">ML</option>
            </select></td>
            <td><input type="number" class="editable cantidad" value="1" min="0" step="0.01" required></td>
            <td><input type="number" class="editable precioUnitario" value="0" min="0" step="0.01" required></td>
            <td class="subtotal"></td>
            <td><button class="delete-btn" onclick="eliminarItemCotizacion(this)" title="Eliminar ítem"><i class="fas fa-trash"></i></button></td>
        `;
        newRow.querySelectorAll('.editable').forEach(input => input.addEventListener('input', calcularCotizacion));
        calcularCotizacion();
    } catch (error) {
        console.error('Error al agregar ítem de cotización:', error);
        showToast('Error al agregar ítem: ' + error.message);
    }
}

function eliminarItemCotizacion(button) {
    try {
        button.closest('tr').remove();
        calcularCotizacion();
    } catch (error) {
        console.error('Error al eliminar ítem de cotización:', error);
        showToast('Error al eliminar ítem: ' + error.message);
    }
}

function toggleAIU() {
    try {
        const conAIU = document.getElementById('conAIU').checked;
        document.getElementById('aiuDesglose').classList.toggle('hidden', !conAIU);
        document.getElementById('valorAdministrativoRow').classList.toggle('hidden', !conAIU);
        document.getElementById('valorImprevistosRow').classList.toggle('hidden', !conAIU);
        document.getElementById('valorUtilidadRow').classList.toggle('hidden', !conAIU);
        document.getElementById('valorAIURow').classList.toggle('hidden', !conAIU);
        calcularCotizacion();
    } catch (error) {
        console.error('Error al alternar AIU:', error);
        showToast('Error al alternar AIU: ' + error.message);
    }
}

function toggleAIUFields() {
    try {
        const moneda = document.getElementById('moneda').value;
        const conAIUField = document.getElementById('conAIUField');
        conAIUField.classList.toggle('hidden', moneda !== 'COP');
        if (moneda !== 'COP') {
            document.getElementById('conAIU').checked = false;
            toggleAIU();
        }
    } catch (error) {
        console.error('Error al alternar campos AIU:', error);
        showToast('Error al alternar campos AIU: ' + error.message);
    }
}

function actualizarTasaCambio() {
    try {
        const moneda = document.getElementById('moneda').value;
        const tasaCambioInput = document.getElementById('tasaCambio');
        tasaCambioInput.disabled = moneda === 'COP';
        tasaCambioInput.value = moneda === 'COP' ? 1 : tasaCambioInput.value || 4000;
        calcularCotizacion();
    } catch (error) {
        console.error('Error al actualizar tasa de cambio:', error);
        showToast('Error al actualizar tasa de cambio: ' + error.message);
    }
}

function calcularCotizacion() {
    try {
        const tabla = document.getElementById('tablaItemsCotizacion');
        const filas = tabla.getElementsByTagName('tbody')[0].rows;
        let subtotalGeneral = 0;
        for (let fila of filas) {
            const cantidad = parseFloat(fila.querySelector('.cantidad').value) || 0;
            const precio = parseFloat(fila.querySelector('.precioUnitario').value) || 0;
            if (cantidad <= 0) {
                document.getElementById('cantidadError').classList.add('active');
                document.getElementById('cantidadError').textContent = 'La cantidad debe ser mayor a 0.';
                return;
            }
            const subtotal = cantidad * precio;
            fila.querySelector('.subtotal').textContent = formatCurrency(subtotal);
            subtotalGeneral += subtotal;
        }
        document.getElementById('cantidadError').classList.remove('active');

        const conAIU = document.getElementById('conAIU').checked;
        let administracion = 0, imprevistos = 0, utilidad = 0, totalAIU = 0;
        if (conAIU) {
            administracion = (parseFloat(document.getElementById('administrativo').value) || 0) / 100 * subtotalGeneral;
            imprevistos = (parseFloat(document.getElementById('imprevistos').value) || 0) / 100 * subtotalGeneral;
            utilidad = (parseFloat(document.getElementById('utilidad').value) || 0) / 100 * subtotalGeneral;
            totalAIU = administracion + imprevistos + utilidad;
        }

        const iva = subtotalGeneral * 0.19;
        const total = subtotalGeneral + totalAIU + iva;
        const tasaCambio = parseFloat(document.getElementById('tasaCambio').value) || 1;
        if (tasaCambio <= 0) {
            document.getElementById('tasaCambioError').classList.add('active');
            return;
        }
        document.getElementById('tasaCambioError').classList.remove('active');

        const moneda = document.getElementById('moneda').value;
        document.getElementById('precioUnitarioCantidad').textContent = formatCurrency(subtotalGeneral, moneda);
        document.getElementById('valorAdministrativo').textContent = formatCurrency(administracion, moneda);
        document.getElementById('valorImprevistos').textContent = formatCurrency(imprevistos, moneda);
        document.getElementById('valorUtilidad').textContent = formatCurrency(utilidad, moneda);
        document.getElementById('valorAIU').textContent = formatCurrency(totalAIU, moneda);
        document.getElementById('iva').textContent = formatCurrency(iva, moneda);
        document.getElementById('precioTotal').textContent = formatCurrency(total, moneda);

        const porcentajeAnticipo = parseFloat(document.getElementById('porcentajeAnticipo').value) || 0;
        const valorAnticipo = total * (porcentajeAnticipo / 100);
        document.getElementById('valorAnticipo').textContent = formatCurrency(valorAnticipo, moneda);

        calcularFechaLlegadaMaterial();
        calcularFechaFinal();
    } catch (error) {
        console.error('Error al calcular cotización:', error);
        showToast('Error al calcular cotización: ' + error.message);
    }
}

function toggleTiempoImportacion() {
    try {
        const importacion = document.getElementById('importacion').value;
        document.getElementById('tiempoImportacionField').classList.toggle('hidden', importacion === 'No');
        calcularFechaLlegadaMaterial();
    } catch (error) {
        console.error('Error al alternar tiempo de importación:', error);
        showToast('Error al alternar tiempo de importación: ' + error.message);
    }
}

function calcularFechaLlegadaMaterial() {
    try {
        const fechaAnticipo = document.getElementById('fechaAnticipo').value;
        const fechaLlegadaInput = document.getElementById('fechaLlegadaMaterial');
        if (!fechaAnticipo) {
            fechaLlegadaInput.value = '';
            calcularFechaFinal();
            return;
        }
        const importacion = document.getElementById('importacion').value;
        let dias = 0;
        if (importacion === 'Sí') {
            dias = parseInt(document.getElementById('tiempoImportacion').value) || 0;
        }
        const fecha = new Date(fechaAnticipo);
        fecha.setDate(fecha.getDate() + dias);
        fechaLlegadaInput.value = fecha.toISOString().split('T')[0];
        calcularFechaFinal();
    } catch (error) {
        console.error('Error al calcular fecha de llegada:', error);
        showToast('Error al calcular fecha de llegada: ' + error.message);
    }
}

function calcularFechaFinal() {
    try {
        const fechaLlegada = document.getElementById('fechaLlegadaMaterial').value;
        const fechaFinalInput = document.getElementById('fechaFinal');
        if (!fechaLlegada) {
            fechaFinalInput.value = '';
            return;
        }
        const planeacion = (parseFloat(document.getElementById('tiempoPlaneacion').value) || 0) * 7;
        const fabricacion = (parseFloat(document.getElementById('tiempoFabricacionDespacho').value) || 0) * 7;
        const instalacion = (parseFloat(document.getElementById('tiempoInstalacion').value) || 0) * 30;
        const fecha = new Date(fechaLlegada);
        fecha.setDate(fecha.getDate() + planeacion + fabricacion + instalacion);
        fechaFinalInput.value = fecha.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error al calcular fecha final:', error);
        showToast('Error al calcular fecha final: ' + error.message);
    }
}

function actualizarConsecutivo() {
    try {
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const ultimoConsecutivo = cotizaciones.reduce((max, cot) => {
            const num = parseInt(cot.consecutivo.replace('SEL', '')) || 0;
            return Math.max(max, num);
        }, 25040000);
        const nuevoConsecutivo = `SEL${ultimoConsecutivo + 1}`;
        document.getElementById('consecutivo').textContent = nuevoConsecutivo;
        return nuevoConsecutivo;
    } catch (error) {
        console.error('Error al actualizar consecutivo:', error);
        showToast('Error al actualizar consecutivo: ' + error.message);
        return 'SEL25040001';
    }
}

// Función para guardar una cotización en Supabase
async function guardarCotizacion(cotizacion) {
    try {
        const { items, ...cotData } = cotizacion;
        const { data: newCot, error: cotError } = await supabase
            .from('cotizaciones')
            .insert([cotData])
            .select()
            .single();

        if (cotError) throw new Error('Error al guardar cotización: ' + cotError.message);

        if (items && items.length > 0) {
            const itemsWithCotId = items.map(item => ({
                ...item,
                cotizacion_id: newCot.id
            }));
            const { error: itemsError } = await supabase
                .from('items')
                .insert(itemsWithCotId);

            if (itemsError) throw new Error('Error al guardar ítems: ' + itemsError.message);
        }

        showToast('Cotización guardada correctamente.');
        cargarCotizaciones(); // Actualizar la lista de cotizaciones (función de consultar.js)
    } catch (error) {
        console.error('Error al guardar cotización:', error);
        showToast('Error al guardar cotización: ' + error.message);
    }
}

// Manejar el envío del formulario de cotización
document.getElementById('cotizacionForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const consecutivo = document.getElementById('consecutivoCotizacion').value;
    const nombreCliente = document.getElementById('nombreCliente').value;
    const proyecto = document.getElementById('proyecto').value;
    const descripcion = document.getElementById('descripcionCotizacion').value;
    const fechaCreacion = new Date().toISOString().split('T')[0];
    const fechaFinal = document.getElementById('fechaFinal').value;
    const importacion = document.getElementById('importacion').checked;
    const tiempoImportacion = parseInt(document.getElementById('tiempoImportacion').value) || 0;
    const fechaLlegadaMaterial = document.getElementById('fechaLlegadaMaterial').value;
    const tiempoPlaneacion = parseInt(document.getElementById('tiempoPlaneacion').value) || 0;
    const tiempoFabricacionDespacho = parseInt(document.getElementById('tiempoFabricacionDespacho').value) || 0;
    const tiempoInstalacion = parseInt(document.getElementById('tiempoInstalacion').value) || 0;
    const formaPago = document.getElementById('formaPago').value;
    const valorAnticipo = parseFloat(document.getElementById('valorAnticipo').value) || 0;
    const conAIU = document.getElementById('conAIU').checked;
    const administrativo = parseFloat(document.getElementById('administrativo').value) || 0;
    const imprevistos = parseFloat(document.getElementById('imprevistos').value) || 0;
    const utilidad = parseFloat(document.getElementById('utilidad').value) || 0;
    const precioTotal = parseFloat(document.getElementById('precioTotalCotizacion').value.replace(/[^0-9.-]+/g, '')) || 0;

    const items = [];
    const tablaItems = document.getElementById('tablaItems').getElementsByTagName('tbody')[0].rows;
    for (let i = 0; i < tablaItems.length; i++) {
        const fila = tablaItems[i];
        items.push({
            descripcion: fila.cells[0].querySelector('input').value,
            unidad: fila.cells[1].querySelector('select').value,
            cantidad: parseFloat(fila.cells[2].querySelector('input').value) || 0,
            precioUnitario: parseFloat(fila.cells[3].querySelector('input').value) || 0
        });
    }

    const cotizacion = {
        consecutivo,
        nombreCliente,
        proyecto,
        descripcion,
        fechaCreacion,
        fechaFinal,
        importacion,
        tiempoImportacion,
        fechaLlegadaMaterial,
        tiempoPlaneacion,
        tiempoFabricacionDespacho,
        tiempoInstalacion,
        formaPago,
        valorAnticipo,
        conAIU,
        administrativo,
        imprevistos,
        utilidad,
        precioTotal,
        items
    };

    await guardarCotizacion(cotizacion);
    $('#cotizacionModal').modal('hide');
    document.getElementById('cotizacionForm').reset();
});

// Función para mostrar notificaciones
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Inicializar event listeners para cálculos automáticos de fechas
document.addEventListener('DOMContentLoaded', () => {
    try {
        const camposFecha = ['fechaAnticipo', 'tiempoImportacion', 'tiempoPlaneacion', 'tiempoFabricacionDespacho', 'tiempoInstalacion'];
        camposFecha.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.addEventListener('input', () => {
                    calcularFechaLlegadaMaterial();
                    calcularFechaFinal();
                });
            }
        });
        const importacionSelect = document.getElementById('importacion');
        if (importacionSelect) {
            importacionSelect.addEventListener('change', () => {
                toggleTiempoImportacion();
                calcularFechaLlegadaMaterial();
                calcularFechaFinal();
            });
        }
    } catch (error) {
        console.error('Error al inicializar listeners de fechas:', error);
        showToast('Error al configurar cálculos de fechas: ' + error.message);
    }
});