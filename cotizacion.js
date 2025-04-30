/* cotizacion.js - Maneja el guardado de cotizaciones con Supabase */

function agregarItemCotizacion() {
    try {
        const tabla = document.getElementById('tablaItemsCotizacion');
        if (!tabla) throw new Error("No se encontró el elemento 'tablaItemsCotizacion'");
        const tbody = tabla.getElementsByTagName('tbody')[0];
        const newRow = tbody.insertRow();
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
        const conAIU = document.getElementById('conAIU');
        if (!conAIU) throw new Error("No se encontró el elemento 'conAIU'");
        const aiuDesglose = document.getElementById('aiuDesglose');
        if (!aiuDesglose) throw new Error("No se encontró el elemento 'aiuDesglose'");
        aiuDesglose.classList.toggle('hidden', !conAIU.checked);
        document.getElementById('valorAdministrativoRow').classList.toggle('hidden', !conAIU.checked);
        document.getElementById('valorImprevistosRow').classList.toggle('hidden', !conAIU.checked);
        document.getElementById('valorUtilidadRow').classList.toggle('hidden', !conAIU.checked);
        document.getElementById('valorAIURow').classList.toggle('hidden', !conAIU.checked);
        calcularCotizacion();
    } catch (error) {
        console.error('Error al alternar AIU:', error);
        showToast('Error al alternar AIU: ' + error.message);
    }
}

function toggleAIUFields() {
    try {
        const moneda = document.getElementById('moneda');
        if (!moneda) throw new Error("No se encontró el elemento 'moneda'");
        const conAIUField = document.getElementById('conAIUField');
        if (!conAIUField) throw new Error("No se encontró el elemento 'conAIUField'");
        conAIUField.classList.toggle('hidden', moneda.value !== 'COP');
        if (moneda.value !== 'COP') {
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
        const moneda = document.getElementById('moneda');
        if (!moneda) throw new Error("No se encontró el elemento 'moneda'");
        const tasaCambioInput = document.getElementById('tasaCambio');
        if (!tasaCambioInput) throw new Error("No se encontró el elemento 'tasaCambio'");
        tasaCambioInput.disabled = moneda.value === 'COP';
        tasaCambioInput.value = moneda.value === 'COP' ? 1 : tasaCambioInput.value || 4000;
        calcularCotizacion();
    } catch (error) {
        console.error('Error al actualizar tasa de cambio:', error);
        showToast('Error al actualizar tasa de cambio: ' + error.message);
    }
}

function calcularCotizacion() {
    try {
        const tabla = document.getElementById('tablaItemsCotizacion');
        if (!tabla) throw new Error("No se encontró el elemento 'tablaItemsCotizacion'");
        const filas = tabla.getElementsByTagName('tbody')[0].rows;
        let subtotalGeneral = 0;
        for (let fila of filas) {
            const cantidad = parseFloat(fila.querySelector('.cantidad').value) || 0;
            const precio = parseFloat(fila.querySelector('.precioUnitario').value) || 0;
            if (cantidad <= 0) {
                const cantidadError = document.getElementById('cantidadError');
                if (!cantidadError) throw new Error("No se encontró el elemento 'cantidadError'");
                cantidadError.classList.add('active');
                cantidadError.textContent = 'La cantidad debe ser mayor a 0.';
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
        const importacion = document.getElementById('importacion');
        if (!importacion) throw new Error("No se encontró el elemento 'importacion'");
        const tiempoImportacionField = document.getElementById('tiempoImportacionField');
        if (!tiempoImportacionField) throw new Error("No se encontró el elemento 'tiempoImportacionField'");
        tiempoImportacionField.classList.toggle('hidden', importacion.value === 'No');
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
        if (!fechaLlegadaInput) throw new Error("No se encontró el elemento 'fechaLlegadaMaterial'");
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
        if (!fechaFinalInput) throw new Error("No se encontró el elemento 'fechaFinal'");
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

async function actualizarConsecutivo() {
    try {
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase no está definido. Verifica que supabase.js esté cargado correctamente.');
        }

        const { data: cotizaciones, error } = await supabase
            .from('cotizaciones')
            .select('consecutivo')
            .order('consecutivo', { ascending: false })
            .limit(1);

        if (error) throw new Error('Error al obtener el último consecutivo: ' + error.message);

        let ultimoConsecutivo = 25040000;
        if (cotizaciones && cotizaciones.length > 0) {
            const ultimo = cotizaciones[0].consecutivo;
            ultimoConsecutivo = parseInt(ultimo.replace('SEL', '')) || ultimoConsecutivo;
        }

        const nuevoConsecutivo = `SEL${ultimoConsecutivo + 1}`;
        const consecutivoElement = document.getElementById('consecutivo');
        if (!consecutivoElement) throw new Error("No se encontró el elemento 'consecutivo'");
        consecutivoElement.textContent = nuevoConsecutivo;
        return nuevoConsecutivo;
    } catch (error) {
        console.error('Error al actualizar consecutivo:', error);
        showToast('Error al actualizar consecutivo: ' + error.message);
        return 'SEL25040001';
    }
}

async function guardarCotizacion() {
    try {
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase no está definido. Verifica que supabase.js esté cargado correctamente.');
        }

        const consecutivo = await actualizarConsecutivo();
        const nombreClienteElement = document.getElementById('nombreCliente');
        const proyectoElement = document.getElementById('proyecto');
        const descripcionElement = document.getElementById('descripcion');
        const monedaElement = document.getElementById('moneda');
        const tasaCambioElement = document.getElementById('tasaCambio');
        const conAIUElement = document.getElementById('conAIU');
        const administrativoElement = document.getElementById('administrativo');
        const imprevistosElement = document.getElementById('imprevistos');
        const utilidadElement = document.getElementById('utilidad');
        const formaPagoElement = document.getElementById('formaPago');
        const porcentajeAnticipoElement = document.getElementById('porcentajeAnticipo');
        const fechaAnticipoElement = document.getElementById('fechaAnticipo');
        const importacionElement = document.getElementById('importacion');
        const tiempoImportacionElement = document.getElementById('tiempoImportacion');
        const fechaLlegadaMaterialElement = document.getElementById('fechaLlegadaMaterial');
        const tiempoPlaneacionElement = document.getElementById('tiempoPlaneacion');
        const tiempoFabricacionDespachoElement = document.getElementById('tiempoFabricacionDespacho');
        const tiempoInstalacionElement = document.getElementById('tiempoInstalacion');
        const fechaFinalElement = document.getElementById('fechaFinal');
        const valorAnticipoElement = document.getElementById('valorAnticipo');
        const precioTotalElement = document.getElementById('precioTotal');

        if (!nombreClienteElement || !proyectoElement || !monedaElement || !tasaCambioElement || !conAIUElement ||
            !administrativoElement || !imprevistosElement || !utilidadElement || !formaPagoElement ||
            !porcentajeAnticipoElement || !fechaAnticipoElement || !importacionElement || !tiempoImportacionElement ||
            !fechaLlegadaMaterialElement || !tiempoPlaneacionElement || !tiempoFabricacionDespachoElement ||
            !tiempoInstalacionElement || !fechaFinalElement || !valorAnticipoElement || !precioTotalElement) {
            throw new Error('Uno o más elementos del formulario no se encontraron en el DOM.');
        }

        const nombreCliente = nombreClienteElement.value || 'Cliente Desconocido';
        const proyecto = proyectoElement.value || 'Proyecto Sin Nombre';
        const descripcion = descripcionElement.value || '';
        const moneda = monedaElement.value;
        const tasaCambio = parseFloat(tasaCambioElement.value) || 1;
        const conAIU = conAIUElement.checked;
        const administrativo = parseFloat(administrativoElement.value) || 0;
        const imprevistos = parseFloat(imprevistosElement.value) || 0;
        const utilidad = parseFloat(utilidadElement.value) || 0;
        const formaPago = formaPagoElement.value;
        const porcentajeAnticipo = parseFloat(porcentajeAnticipoElement.value) || 0;
        const fechaAnticipo = fechaAnticipoElement.value || '';
        const importacion = importacionElement.value === 'Sí';
        const tiempoImportacion = parseInt(tiempoImportacionElement.value) || 0;
        const fechaLlegadaMaterial = fechaLlegadaMaterialElement.value || '';
        const tiempoPlaneacion = parseFloat(tiempoPlaneacionElement.value) || 0;
        const tiempoFabricacionDespacho = parseFloat(tiempoFabricacionDespachoElement.value) || 0;
        const tiempoInstalacion = parseFloat(tiempoInstalacionElement.value) || 0;
        const fechaFinal = fechaFinalElement.value || '';
        const fechaCreacion = new Date().toISOString().split('T')[0];

        const tabla = document.getElementById('tablaItemsCotizacion');
        if (!tabla) throw new Error("No se encontró el elemento 'tablaItemsCotizacion'");
        const tbody = tabla.getElementsByTagName('tbody')[0];
        const items = Array.from(tbody.rows).map(row => ({
            descripcion: row.querySelector('.descripcion')?.value || 'Ítem Sin Descripción',
            unidad: row.querySelector('.unidad')?.value || 'UND',
            cantidad: parseFloat(row.querySelector('.cantidad')?.value) || 0,
            precioUnitario: parseFloat(row.querySelector('.precioUnitario')?.value) || 0
        }));

        if (!items.length || !nombreCliente || !proyecto) {
            showToast('Complete los campos requeridos: Cliente, Proyecto e Ítems.');
            return;
        }

        const cotizacion = {
            consecutivo,
            nombreCliente,
            proyecto,
            descripcion,
            moneda,
            tasaCambio,
            conAIU,
            administrativo,
            imprevistos,
            utilidad,
            formaPago,
            porcentajeAnticipo,
            valorAnticipo: parseFloat(valorAnticipoElement.textContent.replace(/[^0-9.]/g, '')) || 0,
            fechaAnticipo,
            importacion,
            tiempoImportacion,
            fechaLlegadaMaterial,
            tiempoPlaneacion,
            tiempoFabricacionDespacho,
            tiempoInstalacion,
            fechaFinal,
            fechaCreacion,
            precioTotal: parseFloat(precioTotalElement.textContent.replace(/[^0-9.]/g, '')) || 0
        };

        console.log('Cotización a guardar:', cotizacion);

        // Guardar en Supabase
        const { items: itemsData, ...cotData } = cotizacion;
        const { data: newCot, error: cotError } = await supabase
            .from('cotizaciones')
            .insert([cotData])
            .select()
            .single();

        if (cotError) throw new Error('Error al guardar cotización: ' + cotError.message);

        if (itemsData && itemsData.length > 0) {
            const itemsWithCotId = itemsData.map(item => ({
                ...item,
                cotizacion_id: newCot.id
            }));
            const { error: itemsError } = await supabase
                .from('items')
                .insert(itemsWithCotId);

            if (itemsError) throw new Error('Error al guardar ítems: ' + itemsError.message);
        }

        showToast('Cotización guardada exitosamente.', 'success');
        await actualizarConsecutivo();
        nombreClienteElement.value = '';
        proyectoElement.value = '';
        descripcionElement.value = '';
        tbody.innerHTML = '';
        calcularCotizacion();
        if (typeof cargarCotizaciones === 'function') {
            cargarCotizaciones(); // Actualizar la lista de cotizaciones en la pestaña Consultar
        } else {
            console.warn('La función cargarCotizaciones no está definida. Asegúrate de que consultar.js esté cargado.');
        }
    } catch (error) {
        console.error('Error al guardar cotización:', error);
        showToast('Error al guardar cotización: ' + error.message);
    }
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
            } else {
                console.warn(`Elemento con ID '${id}' no encontrado en el DOM.`);
            }
        });
        const importacionSelect = document.getElementById('importacion');
        if (importacionSelect) {
            importacionSelect.addEventListener('change', () => {
                toggleTiempoImportacion();
                calcularFechaLlegadaMaterial();
                calcularFechaFinal();
            });
        } else {
            console.warn("Elemento con ID 'importacion' no encontrado en el DOM.");
        }

        // Event listeners adicionales para cálculos automáticos
        const camposCalculo = ['moneda', 'tasaCambio', 'administrativo', 'imprevistos', 'utilidad', 'porcentajeAnticipo', 'conAIU'];
        camposCalculo.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.addEventListener('change', calcularCotizacion);
                elemento.addEventListener('input', calcularCotizacion);
            } else {
                console.warn(`Elemento con ID '${id}' no encontrado en el DOM.`);
            }
        });

        // Event listener para agregar ítems
        const agregarItemBtn = document.getElementById('agregarItemCotizacion');
        if (agregarItemBtn) {
            agregarItemBtn.addEventListener('click', agregarItemCotizacion);
        } else {
            console.warn("Elemento con ID 'agregarItemCotizacion' no encontrado en el DOM.");
        }

        // Event listener para guardar cotización
        const cotizacionForm = document.getElementById('cotizacionForm');
        if (cotizacionForm) {
            cotizacionForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                await guardarCotizacion();
                $('#cotizacionModal').modal('hide');
                cotizacionForm.reset();
            });
        } else {
            console.warn("Elemento con ID 'cotizacionForm' no encontrado en el DOM.");
        }

        // Inicializar consecutivo y cálculos
        actualizarConsecutivo();
        calcularCotizacion();
    } catch (error) {
        console.error('Error al inicializar listeners:', error);
        showToast('Error al configurar la página: ' + error.message);
    }
});

function formatCurrency(value, currency = 'COP') {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0
    }).format(value);
}

function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
