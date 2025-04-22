// Definición de categorías
const categorias = ["Preliminares", "Administrativo", "ManoObra", "Materiales", "SST", "LogisticaTransporte", "HerramientasEquipos", "Viaticos"];

// Formatea números con separadores de miles
function formatNumber(number) {
    if (isNaN(number)) return '0.00';
    return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Formatea valores monetarios
function formatCurrency(number, moneda = 'COP') {
    return `$ ${formatNumber(number)} ${moneda}`;
}

// Cambia entre pestañas
function openTab(tabName) {
    try {
        const tabs = document.querySelectorAll('.tab-content');
        const buttons = document.querySelectorAll('.sidebar-nav a');
        
        if (!tabs.length || !buttons.length) {
            throw new Error('No se encontraron pestañas o botones de navegación');
        }

        tabs.forEach(tab => tab.classList.remove('active'));
        buttons.forEach(btn => btn.classList.remove('active'));

        const tab = document.getElementById(tabName);
        if (!tab) {
            throw new Error(`Pestaña "${tabName}" no encontrada`);
        }
        tab.classList.add('active');

        const button = document.querySelector(`.sidebar-nav a[data-tab="${tabName}"]`);
        if (button) {
            button.classList.add('active');
        } else {
            console.warn(`Botón para pestaña "${tabName}" no encontrado`);
        }

        if (tabName === 'cotizacion') {
            calcularCotizacion();
            actualizarConsecutivo();
            actualizarTasaCambio();
            toggleAIUFields();
        } else if (tabName === 'consultar') {
            filtrarCotizaciones();
        }
    } catch (error) {
        console.error('Error al cambiar pestaña:', error.message);
        alert(`Error al cambiar de pestaña: ${error.message}`);
    }
}

// Descarga plantilla Excel
function descargarPlantilla() {
    try {
        if (!window.XLSX) throw new Error('Librería XLSX no cargada');
        const wb = XLSX.utils.book_new();
        categorias.forEach(categoria => {
            const header = ["Descripción", "Unidad", "Cantidad", "Precio Unitario"];
            const ws = XLSX.utils.aoa_to_sheet([header]);
            XLSX.utils.book_append_sheet(wb, ws, categoria);
        });
        XLSX.writeFile(wb, "plantilla_apu.xlsx");
    } catch (error) {
        console.error('Error al descargar plantilla:', error);
        alert('Error al generar la plantilla Excel.');
    }
}

// Lee archivo Excel
function leerExcel(file) {
    try {
        if (!file) throw new Error('No se seleccionó archivo');
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            categorias.forEach(categoria => {
                if (workbook.SheetNames.includes(categoria)) {
                    const wsData = XLSX.utils.sheet_to_json(workbook.Sheets[categoria], { header: 1 });
                    insertarDatosDesdeExcel(categoria, wsData);
                }
            });
            calcularAPU();
        };
        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('Error al leer Excel:', error);
        alert('Error al cargar el archivo Excel.');
    }
}

// Inserta datos desde Excel
function insertarDatosDesdeExcel(categoria, data) {
    try {
        const tabla = document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0];
        tabla.innerHTML = '';
        for (let i = 1; i < data.length; i++) {
            const rowData = data[i];
            if (rowData && rowData.length >= 4) {
                agregarFilaDesdeExcel(categoria, ...rowData);
            }
        }
    } catch (error) {
        console.error(`Error al insertar datos en ${categoria}:`, error);
    }
}

// Agrega fila desde Excel
function agregarFilaDesdeExcel(categoria, descripcion, unidad, cantidad, precioUnitario) {
    try {
        const tabla = document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0];
        const newRow = tabla.insertRow();
        newRow.innerHTML = `
            <td><input type="text" class="editable" value="${descripcion || ''}"></td>
            <td><select class="editable">
                <option value="M2" ${unidad === 'M2' ? 'selected' : ''}>M2</option>
                <option value="ML" ${unidad === 'ML' ? 'selected' : ''}>ML</option>
                <option value="UND" ${unidad === 'UND' ? 'selected' : ''}>UND</option>
            </select></td>
            <td><input type="number" class="editable cantidad${categoria}" value="${parseFloat(cantidad) || 0}" min="0"></td>
            <td><input type="number" class="editable precioUnitario${categoria}" value="${parseFloat(precioUnitario) || 0}" min="0"></td>
            <td class="subtotal${categoria}"></td>
            <td><button class="delete-btn" onclick="eliminarFila(this, '${categoria}')"><i class="fas fa-trash"></i></button></td>
        `;
        newRow.querySelectorAll('.editable').forEach(input => {
            input.addEventListener('input', () => calcularAPU());
        });
    } catch (error) {
        console.error(`Error al agregar fila en ${categoria}:`, error);
    }
}

// Agrega fila manualmente
function agregarFila(categoria) {
    try {
        const tabla = document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0];
        const newRow = tabla.insertRow();
        newRow.innerHTML = `
            <td><input type="text" class="editable" value="Nuevo ${categoria}"></td>
            <td><select class="editable">
                <option value="M2">M2</option>
                <option value="ML">ML</option>
                <option value="UND">UND</option>
            </select></td>
            <td><input type="number" class="editable cantidad${categoria}" value="0" min="0"></td>
            <td><input type="number" class="editable precioUnitario${categoria}" value="0" min="0"></td>
            <td class="subtotal${categoria}"></td>
            <td><button class="delete-btn" onclick="eliminarFila(this, '${categoria}')"><i class="fas fa-trash"></i></button></td>
        `;
        newRow.querySelectorAll('.editable').forEach(input => {
            input.addEventListener('input', () => calcularAPU());
        });
        calcularAPU();
    } catch (error) {
        console.error(`Error al agregar fila en ${categoria}:`, error);
        alert('Error al agregar fila.');
    }
}

// Elimina fila
function eliminarFila(button, categoria) {
    try {
        button.closest('tr').remove();
        calcularAPU();
    } catch (error) {
        console.error(`Error al eliminar fila en ${categoria}:`, error);
        alert('Error al eliminar fila.');
    }
}

// Calcula subtotal por fila
function calcularSubtotalRow(row, categoria) {
    try {
        const cantidad = parseFloat(row.querySelector(`.cantidad${categoria}`).value) || 0;
        const precio = parseFloat(row.querySelector(`.precioUnitario${categoria}`).value) || 0;
        const subtotal = cantidad * precio;
        row.querySelector(`.subtotal${categoria}`).textContent = formatCurrency(subtotal);
        return subtotal;
    } catch (error) {
        console.error(`Error al calcular subtotal en ${categoria}:`, error);
        return 0;
    }
}

// Calcula total por categoría
function calcularTotal(categoria) {
    try {
        let total = 0;
        const tabla = document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0];
        for (let row of tabla.rows) {
            total += calcularSubtotalRow(row, categoria);
        }
        document.getElementById(`total${categoria}`).textContent = formatCurrency(total);
        return total;
    } catch (error) {
        console.error(`Error al calcular total de ${categoria}:`, error);
        return 0;
    }
}

// Calcula precio unitario total
function calcularAPU() {
    try {
        let subtotal = 0;
        const totals = {};
        categorias.forEach(categoria => {
            totals[categoria] = calcularTotal(categoria);
            subtotal += totals[categoria];
        });

        const margen = parseFloat(document.getElementById('margen_contributivo').value) || 0;
        let total = 0;
        if (margen >= 100) {
            alert('El margen contributivo no puede ser 100% o mayor.');
            total = subtotal;
        } else if (margen < 0) {
            alert('El margen contributivo no puede ser negativo.');
            total = subtotal;
        } else {
            total = subtotal / (1 - margen / 100);
        }

        document.getElementById('resultado').textContent = formatCurrency(total);
        categorias.forEach(categoria => {
            const porcentaje = total > 0 ? (totals[categoria] / total * 100).toFixed(2) : 0;
            document.getElementById(`porcentaje${categoria}`).textContent = `${porcentaje}%`;
        });
    } catch (error) {
        console.error('Error al calcular APU:', error);
        alert('Error al calcular el precio unitario.');
    }
}

// Descarga PDF de la calculadora
function descargarPDFCalculadora() {
    try {
        if (!window.jspdf) throw new Error('Librería jsPDF no cargada');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        const margin = 15;
        let y = margin;

        doc.setFontSize(16);
        doc.text('Análisis de Precio Unitario (APU)', 105, y, { align: 'center' });
        y += 10;
        doc.setFontSize(10);
        doc.text('Cotizador APU - Informe', 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(12);
        doc.text(`Margen Contributivo: ${document.getElementById('margen_contributivo').value}%`, margin, y);
        y += 10;

        const tableData = categorias.map(categoria => [
            categoria,
            document.getElementById(`total${categoria}`).textContent,
            document.getElementById(`porcentaje${categoria}`).textContent
        ]);
        doc.autoTable({
            startY: y,
            head: [['Categoría', 'Total', 'Porcentaje']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [44, 62, 80] },
            margin: { left: margin, right: margin }
        });
        y = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.text(`Precio Unitario Total: ${document.getElementById('resultado').textContent}`, margin, y);
        y += 10;

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${pageCount}`, 190, 287, { align: 'right' });
            doc.text(`Generado el ${new Date().toLocaleDateString('es-CO')}`, margin, 287);
        }

        doc.save('apu.pdf');
    } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('Error al generar el PDF de la calculadora.');
    }
}

// Descarga JSON
function descargarJSON() {
    try {
        const data = categorias.reduce((acc, cat) => {
            acc[cat] = [];
            const tabla = document.getElementById(`tabla${cat}`).getElementsByTagName('tbody')[0];
            for (let row of tabla.rows) {
                acc[cat].push([
                    row.cells[0].querySelector('input').value,
                    row.cells[1].querySelector('select').value,
                    row.cells[2].querySelector('input').value,
                    row.cells[3].querySelector('input').value
                ]);
            }
            return acc;
        }, {});
        data.margenContributivo = document.getElementById('margen_contributivo').value;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'apu.json';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error al descargar JSON:', error);
        alert('Error al guardar JSON.');
    }
}

// Carga JSON
function cargarJSON(files) {
    try {
        const file = files[0];
        if (!file) throw new Error('No se seleccionó archivo');
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            categorias.forEach(categoria => {
                const tabla = document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0];
                tabla.innerHTML = '';
                if (data[categoria]) {
                    data[categoria].forEach(rowData => agregarFilaDesdeExcel(categoria, ...rowData));
                }
            });
            document.getElementById('margen_contributivo').value = data.margenContributivo || 10;
            calcularAPU();
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Error al cargar JSON:', error);
        alert('Error al cargar JSON.');
    }
}

// Calcula cotización
function calcularCotizacion() {
    try {
        let precioUnitario = parseFloat(document.getElementById('precioUnitario').value) || 0;
        let cantidad = parseFloat(document.getElementById('cantidad').value) || 0;
        let moneda = document.getElementById('moneda').value;
        let tasaCambio = parseFloat(document.getElementById('tasaCambio').value) || 1;

        if (precioUnitario < 0) {
            document.getElementById('precioUnitarioError').style.display = 'block';
            precioUnitario = 0;
        } else {
            document.getElementById('precioUnitarioError').style.display = 'none';
        }
        if (cantidad < 0) {
            document.getElementById('cantidadError').style.display = 'block';
            cantidad = 0;
        } else {
            document.getElementById('cantidadError').style.display = 'none';
        }
        if (tasaCambio <= 0) {
            document.getElementById('tasaCambioError').style.display = 'block';
            tasaCambio = 1;
            document.getElementById('tasaCambio').value = 1;
        } else {
            document.getElementById('tasaCambioError').style.display = 'none';
        }

        let precioUnitarioMoneda = precioUnitario * tasaCambio;

        let valorAIU = 0;
        let administrativo = 0;
        let imprevistos = 0;
        let utilidad = 0;
        if (document.getElementById('conAIU').checked && moneda === 'COP') {
            const baseAIU = precioUnitarioMoneda * cantidad;
            administrativo = (parseFloat(document.getElementById('administrativo').value) || 0) / 100 * baseAIU;
            imprevistos = (parseFloat(document.getElementById('imprevistos').value) || 0) / 100 * baseAIU;
            utilidad = (parseFloat(document.getElementById('utilidad').value) || 0) / 100 * baseAIU;
            valorAIU = administrativo + imprevistos + utilidad;
        }

        let iva = moneda === 'COP' ? (precioUnitarioMoneda * cantidad + valorAIU) * 0.19 : 0;

        const porcentajeAnticipo = parseFloat(document.getElementById('porcentajeAnticipo').value) || 0;
        const valorAnticipo = (precioUnitarioMoneda * cantidad + valorAIU + iva) * (porcentajeAnticipo / 100);

        document.getElementById('precioUnitarioMoneda').textContent = formatCurrency(precioUnitarioMoneda, 'COP');
        document.getElementById('precioUnitarioCantidad').textContent = formatCurrency(precioUnitarioMoneda * cantidad, 'COP');
        document.getElementById('valorAdministrativo').textContent = formatCurrency(administrativo, 'COP');
        document.getElementById('valorImprevistos').textContent = formatCurrency(imprevistos, 'COP');
        document.getElementById('valorUtilidad').textContent = formatCurrency(utilidad, 'COP');
        document.getElementById('valorAIU').textContent = formatCurrency(valorAIU, 'COP');
        document.getElementById('iva').textContent = formatCurrency(iva, 'COP');
        document.getElementById('valorAnticipo').textContent = formatCurrency(valorAnticipo, 'COP');
        document.getElementById('precioTotal').textContent = formatCurrency(precioUnitarioMoneda * cantidad + valorAIU + iva, 'COP');
    } catch (error) {
        console.error('Error al calcular cotización:', error);
        alert('Error al calcular cotización.');
    }
}

// Descarga cotización como PDF
function descargarCotizacion() {
    try {
        if (!window.jspdf) throw new Error('Librería jsPDF no cargada');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        const margin = 15;
        let y = margin;

        doc.setFontSize(16);
        doc.text('Cotización', 105, y, { align: 'center' });
        y += 10;
        doc.setFontSize(10);
        doc.text('Cotizador APU - Informe de Cotización', 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(12);
        doc.text('Información General', margin, y);
        y += 5;
        doc.setFontSize(10);
        doc.text(`Consecutivo: ${document.getElementById('consecutivo').textContent}`, margin, y);
        y += 5;
        doc.text(`Cliente: ${document.getElementById('nombreCliente').value || 'N/A'}`, margin, y);
        y += 5;
        doc.text(`Proyecto: ${document.getElementById('proyecto').value || 'N/A'}`, margin, y);
        y += 5;
        doc.text(`Descripción: ${document.getElementById('descripcion').value.substring(0, 100) || 'N/A'}...`, margin, y);
        y += 10;

        doc.setFontSize(12);
        doc.text('Detalles Financieros', margin, y);
        y += 5;
        const financialData = [
            ['Precio Unitario', document.getElementById('precioUnitario').value || '0.00', document.getElementById('moneda').value],
            ['Unidad de Medida', document.getElementById('unidadMedida').value, ''],
            ['Cantidad', document.getElementById('cantidad').value || '0', ''],
            ['Precio en COP', document.getElementById('precioUnitarioMoneda').textContent, ''],
            ['Subtotal', document.getElementById('precioUnitarioCantidad').textContent, '']
        ];
        if (document.getElementById('conAIU').checked) {
            financialData.push(['Administración', document.getElementById('valorAdministrativo').textContent, '']);
            financialData.push(['Imprevistos', document.getElementById('valorImprevistos').textContent, '']);
            financialData.push(['Utilidad', document.getElementById('valorUtilidad').textContent, '']);
            financialData.push(['Total AIU', document.getElementById('valorAIU').textContent, '']);
        }
        financialData.push(['IVA (19%)', document.getElementById('iva').textContent, '']);
        financialData.push(['Total', document.getElementById('precioTotal').textContent, '']);
        doc.autoTable({
            startY: y,
            head: [['Concepto', 'Valor', 'Moneda']],
            body: financialData,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [44, 62, 80] },
            margin: { left: margin, right: margin }
        });
        y = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.text('Condiciones de Pago', margin, y);
        y += 5;
        const paymentData = [
            ['Forma de Pago', document.getElementById('formaPago').value],
            ['Anticipo', document.getElementById('valorAnticipo').textContent],
            ['Tiempo de Entrega', document.getElementById('tiempoEntrega').value || 'N/A']
        ];
        doc.autoTable({
            startY: y,
            head: [['Concepto', 'Valor']],
            body: paymentData,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [44, 62, 80] },
            margin: { left: margin, right: margin }
        });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${pageCount}`, 190, 287, { align: 'right' });
            doc.text(`Generado el ${new Date().toLocaleDateString('es-CO')}`, margin, 287);
        }

        doc.save(`cotizacion_${document.getElementById('consecutivo').textContent}.pdf`);
        return true;
    } catch (error) {
        console.error('Error al generar PDF cotización:', error);
        alert('Error al generar PDF de cotización.');
        return false;
    }
}

// Genera PDF para cotización específica
function generarPDFCotizacion(index) {
    try {
        if (!window.jspdf) throw new Error('Librería jsPDF no cargada');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const cotizacion = cotizaciones[index];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        const margin = 15;
        let y = margin;

        doc.setFontSize(16);
        doc.text('Cotización', 105, y, { align: 'center' });
        y += 10;
        doc.setFontSize(10);
        doc.text('Cotizador APU - Informe de Cotización', 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(12);
        doc.text('Información General', margin, y);
        y += 5;
        doc.setFontSize(10);
        doc.text(`Consecutivo: ${cotizacion.consecutivo}`, margin, y);
        y += 5;
        doc.text(`Cliente: ${cotizacion.cliente || 'N/A'}`, margin, y);
        y += 5;
        doc.text(`Proyecto: ${cotizacion.proyecto || 'N/A'}`, margin, y);
        y += 5;
        doc.text(`Fecha: ${new Date(cotizacion.fecha).toLocaleDateString('es-CO')}`, margin, y);
        y += 10;

        doc.setFontSize(12);
        doc.text('Detalles Financieros', margin, y);
        y += 5;
        const financialData = [
            ['Cantidad', cotizacion.cantidad || '0', ''],
            ['Valor Total', formatCurrency(cotizacion.valorTotal, cotizacion.moneda), '']
        ];
        doc.autoTable({
            startY: y,
            head: [['Concepto', 'Valor', 'Moneda']],
            body: financialData,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [44, 62, 80] },
            margin: { left: margin, right: margin }
        });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${pageCount}`, 190, 287, { align: 'right' });
            doc.text(`Generado el ${new Date().toLocaleDateString('es-CO')}`, margin, 287);
        }

        doc.save(`cotizacion_${cotizacion.consecutivo}.pdf`);
    } catch (error) {
        console.error('Error al generar PDF de cotización:', error);
        alert('Error al generar PDF de cotización.');
    }
}

// Guarda cotización
function guardarCotizacion() {
    try {
        if (!descargarCotizacion()) return;
        const cotizacion = {
            consecutivo: document.getElementById('consecutivo').textContent,
            cliente: document.getElementById('nombreCliente').value,
            proyecto: document.getElementById('proyecto').value,
            cantidad: parseFloat(document.getElementById('cantidad').value) || 0,
            valorTotal: parseFloat(document.getElementById('precioTotal').textContent.replace(/[^0-9.-]+/g, '')) || 0,
            moneda: document.getElementById('moneda').value,
            fecha: new Date().toISOString(),
            version: 1,
            parentId: null
        };
        let cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        cotizaciones.push(cotizacion);
        localStorage.setItem('cotizaciones', JSON.stringify(cotizaciones));
        actualizarConsecutivo();
        alert('Cotización guardada exitosamente.');
        openTab('consultar');
    } catch (error) {
        console.error('Error al guardar cotización:', error);
        alert('Error al guardar cotización.');
    }
}

// Usa precio en cotización
function usarEnCotizacion() {
    try {
        const precio = parseFloat(document.getElementById('resultado').textContent.replace(/[^0-9.-]+/g, '')) || 0;
        document.getElementById('precioUnitario').value = precio.toFixed(2);
        openTab('cotizacion');
        calcularCotizacion();
    } catch (error) {
        console.error('Error al usar en cotización:', error);
        alert('Error al transferir precio.');
    }
}

// Actualiza tasa de cambio
function actualizarTasaCambio() {
    try {
        const moneda = document.getElementById('moneda').value;
        const tasasSugeridas = { 'COP': 1, 'USD': 4100, 'EUR': 4500 };
        let tasaActual = parseFloat(document.getElementById('tasaCambio').value);
        if (isNaN(tasaActual) || tasaActual <= 0) {
            tasaActual = tasasSugeridas[moneda];
            document.getElementById('tasaCambio').value = tasaActual.toFixed(2);
        }
        calcularCotizacion();
    } catch (error) {
        console.error('Error al actualizar tasa de cambio:', error);
    }
}

// Alterna AIU
function toggleAIU() {
    document.getElementById('aiuDesglose').classList.toggle('hidden', !document.getElementById('conAIU').checked);
    calcularCotizacion();
}

// Alterna campos AIU según moneda
function toggleAIUFields() {
    const isCOP = document.getElementById('moneda').value === 'COP';
    document.getElementById('conAIUField').classList.toggle('hidden', !isCOP);
    document.getElementById('aiuDesglose').classList.toggle('hidden', !isCOP || !document.getElementById('conAIU').checked);
    document.getElementById('ivaField').classList.toggle('hidden', !isCOP);
    calcularCotizacion();
}

// Actualiza consecutivo
function actualizarConsecutivo() {
    try {
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const lastCotizacion = cotizaciones[cotizaciones.length - 1];
        let nextNumber = 1;
        if (lastCotizacion) {
            const lastNumber = parseInt(lastCotizacion.consecutivo.replace('SEL2503', '')) || 0;
            nextNumber = lastNumber + 1;
        }
        document.getElementById('consecutivo').textContent = `SEL2503${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
        console.error('Error al actualizar consecutivo:', error);
        document.getElementById('consecutivo').textContent = 'SEL25030001';
    }
}

// Filtra cotizaciones
function filtrarCotizaciones() {
    try {
        const search = document.getElementById('buscarCliente').value.toLowerCase();
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const tbody = document.getElementById('listaCotizaciones').getElementsByTagName('tbody')[0];
        tbody.innerHTML = '';

        cotizaciones
            .filter(c => (c.cliente || '').toLowerCase().includes(search) || (c.proyecto || '').toLowerCase().includes(search))
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .forEach((c, index) => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${c.consecutivo}</td>
                    <td>${c.cliente || 'N/A'}</td>
                    <td>${c.proyecto || 'N/A'}</td>
                    <td>${c.cantidad}</td>
                    <td>${formatCurrency(c.valorTotal, c.moneda)}</td>
                    <td>
                        <button onclick="duplicarCotizacion(${index})">Duplicar</button>
                        <button onclick="editarCotizacion(${index})">Editar</button>
                        <button onclick="nuevaVersionCotizacion(${index})">Nueva Versión</button>
                        <button class="delete-btn" onclick="eliminarCotizacion(${index})">Eliminar</button>
                    </td>
                    <td><button class="pdf-btn" onclick="generarPDFCotizacion(${index})">PDF</button></td>
                `;
            });

        if (tbody.rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No hay cotizaciones.</td></tr>';
        }
    } catch (error) {
        console.error('Error al filtrar cotizaciones:', error);
        alert('Error al mostrar cotizaciones.');
    }
}

// Duplica cotización
function duplicarCotizacion(index) {
    try {
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const cotizacion = { ...cotizaciones[index] };
        cotizacion.consecutivo = `SEL2503${String(parseInt(cotizacion.consecutivo.replace('SEL2503', '')) + 1).padStart(4, '0')}`;
        cotizacion.fecha = new Date().toISOString();
        cotizaciones.push(cotizacion);
        localStorage.setItem('cotizaciones', JSON.stringify(cotizaciones));
        filtrarCotizaciones();
        alert('Cotización duplicada exitosamente.');
    } catch (error) {
        console.error('Error al duplicar cotización:', error);
        alert('Error al duplicar cotización.');
    }
}

// Edita cotización
function editarCotizacion(index) {
    try {
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const cotizacion = cotizaciones[index];
        document.getElementById('consecutivo').textContent = cotizacion.consecutivo;
        document.getElementById('nombreCliente').value = cotizacion.cliente || '';
        document.getElementById('proyecto').value = cotizacion.proyecto || '';
        document.getElementById('cantidad').value = cotizacion.cantidad;
        document.getElementById('precioUnitario').value = (cotizacion.valorTotal / cotizacion.cantidad).toFixed(2);
        document.getElementById('moneda').value = cotizacion.moneda;
        openTab('cotizacion');
        calcularCotizacion();
        cotizaciones.splice(index, 1);
        localStorage.setItem('cotizaciones', JSON.stringify(cotizaciones));
    } catch (error) {
        console.error('Error al editar cotización:', error);
        alert('Error al editar cotización.');
    }
}

// Crea nueva versión de cotización
function nuevaVersionCotizacion(index) {
    try {
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const cotizacion = { ...cotizaciones[index] };
        cotizacion.consecutivo = `SEL2503${String(parseInt(cotizacion.consecutivo.replace('SEL2503', '')) + 1).padStart(4, '0')}`;
        cotizacion.fecha = new Date().toISOString();
        cotizacion.version = (cotizacion.version || 1) + 1;
        cotizacion.parentId = cotizaciones[index].consecutivo;
        cotizaciones.push(cotizacion);
        localStorage.setItem('cotizaciones', JSON.stringify(cotizaciones));
        filtrarCotizaciones();
        alert('Nueva versión creada exitosamente.');
    } catch (error) {
        console.error('Error al crear nueva versión:', error);
        alert('Error al crear nueva versión.');
    }
}

// Elimina cotización
function eliminarCotizacion(index) {
    try {
        if (confirm('¿Eliminar esta cotización?')) {
            const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
            cotizaciones.splice(index, 1);
            localStorage.setItem('cotizaciones', JSON.stringify(cotizaciones));
            filtrarCotizaciones();
            alert('Cotización eliminada.');
        }
    } catch (error) {
        console.error('Error al eliminar cotización:', error);
        alert('Error al eliminar cotización.');
    }
}

// Exporta cotizaciones
function exportarCotizaciones() {
    try {
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const blob = new Blob([JSON.stringify(cotizaciones, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cotizaciones.json';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error al exportar cotizaciones:', error);
        alert('Error al exportar cotizaciones.');
    }
}

// Importa cotizaciones
function importarCotizaciones(files) {
    try {
        const file = files[0];
        if (!file) throw new Error('No se seleccionó archivo');
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            let cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
            cotizaciones = cotizaciones.concat(data);
            localStorage.setItem('cotizaciones', JSON.stringify(cotizaciones));
            filtrarCotizaciones();
            alert('Cotizaciones importadas exitosamente.');
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Error al importar cotizaciones:', error);
        alert('Error al importar cotizaciones.');
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    try {
        openTab('calculadora');
        
        const tabButtons = document.querySelectorAll('.sidebar-nav a.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = button.getAttribute('data-tab');
                openTab(tabName);
            });
        });

        const cotizacionInputs = [
            'precioUnitario', 'cantidad', 'moneda', 'administrativo', 
            'imprevistos', 'utilidad', 'porcentajeAnticipo', 'formaPago', 'tasaCambio'
        ];
        cotizacionInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', calcularCotizacion);
            }
        });

        categorias.forEach(categoria => {
            document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0].innerHTML = '';
        });

        actualizarConsecutivo();
    } catch (error) {
        console.error('Error al inicializar:', error);
        alert('Error al cargar la aplicación.');
    }
});