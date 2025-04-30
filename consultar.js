function filtrarCotizaciones() {
    try {
        const buscar = document.getElementById('buscarCliente').value.toLowerCase();
        const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');
        const tabla = document.getElementById('listaCotizaciones').getElementsByTagName('tbody')[0];
        tabla.innerHTML = '';

        cotizaciones
            .filter(cot => {
                const nombreCliente = (cot.nombreCliente || '').toLowerCase();
                const proyecto = (cot.proyecto || '').toLowerCase();
                const consecutivo = (cot.consecutivo || '').toLowerCase();
                return nombreCliente.includes(buscar) || proyecto.includes(buscar) || consecutivo.includes(buscar);
            })
            .forEach(cot => {
                const totalCantidad = cot.items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
                const row = tabla.insertRow();
                row.innerHTML = `
                    <td>${cot.consecutivo}</td>
                    <td>${cot.nombreCliente || 'Sin Cliente'}</td>
                    <td>${cot.proyecto || 'Sin Proyecto'}</td>
                    <td>${totalCantidad.toFixed(2)}</td>
                    <td>${formatCurrency(cot.precioTotal || 0, cot.moneda || 'COP')}</td>
                    <td>
                        <button class="action-btn" onclick="editarCotizacion('${cot.consecutivo}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="action-btn" onclick="eliminarCotizacion('${cot.consecutivo}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                    <td><button class="pdf-btn" onclick="descargarPDFCotizacion('${cot.consecutivo}')" title="Descargar PDF"><i class="fas fa-file-pdf"></i></button></td>
                `;
            });
    } catch (error) {
        console.error('Error al filtrar cotizaciones:', error);
        showToast('Error al filtrar cotizaciones: ' + error.message);
    }
}

// Función para cargar cotizaciones desde Supabase
async function cargarCotizaciones() {
    try {
        const { data: cotizaciones, error } = await supabase
            .from('cotizaciones')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error('Error al cargar cotizaciones: ' + error.message);

        const tbody = document.getElementById('cotizacionesBody');
        tbody.innerHTML = '';

        if (cotizaciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay cotizaciones registradas.</td></tr>';
            return;
        }

        cotizaciones.forEach(cot => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cot.consecutivo}</td>
                <td>${cot.nombreCliente || 'Sin Cliente'}</td>
                <td>${cot.proyecto || 'Sin Proyecto'}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="descargarPDFCotizacion('${cot.consecutivo}')">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarCotizacion('${cot.consecutivo}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error al cargar cotizaciones:', error);
        showToast('Error al cargar cotizaciones: ' + error.message);
    }
}

// Función para eliminar una cotización de Supabase
async function eliminarCotizacion(consecutivo) {
    if (!confirm('¿Estás seguro de eliminar esta cotización?')) return;

    try {
        // Primero, obtener el ID de la cotización para eliminar los ítems asociados
        const { data: cotizacion, error: fetchError } = await supabase
            .from('cotizaciones')
            .select('id')
            .eq('consecutivo', consecutivo)
            .single();

        if (fetchError || !cotizacion) throw new Error('Cotización no encontrada.');

        // Eliminar la cotización (los ítems se eliminan automáticamente por la restricción ON DELETE CASCADE)
        const { error: deleteError } = await supabase
            .from('cotizaciones')
            .delete()
            .eq('consecutivo', consecutivo);

        if (deleteError) throw new Error('Error al eliminar cotización: ' + deleteError.message);

        showToast('Cotización eliminada correctamente.');
        cargarCotizaciones(); // Actualizar la lista de cotizaciones
    } catch (error) {
        console.error('Error al eliminar cotización:', error);
        showToast('Error al eliminar cotización: ' + error.message);
    }
}

// Función para generar el PDF
async function descargarPDFCotizacion(consecutivo) {
    try {
        // Obtener la cotización desde Supabase
        const { data: cotizacion, error: cotError } = await supabase
            .from('cotizaciones')
            .select('*')
            .eq('consecutivo', consecutivo)
            .single();

        if (cotError || !cotizacion) throw new Error('Cotización no encontrada.');

        // Obtener los ítems asociados a la cotización
        const { data: items, error: itemsError } = await supabase
            .from('items')
            .select('*')
            .eq('cotizacion_id', cotizacion.id);

        if (itemsError) throw new Error('Error al obtener los ítems: ' + itemsError.message);

        // Preparar el objeto cot para el PDF
        const cot = {
            ...cotizacion,
            items: items || []
        };

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Constantes para el diseño
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const lineHeight = 6;
        let y = margin;

        // Borde alrededor del contenido
        doc.setLineWidth(0.2);
        doc.setDrawColor(150, 150, 150);
        doc.rect(margin - 5, margin - 5, pageWidth - 2 * (margin - 5), pageHeight - 2 * (margin - 5));

        // Fondo del encabezado
        doc.setFillColor(220, 230, 240); // Gris-azul claro
        doc.rect(margin - 5, margin - 5, pageWidth - 2 * (margin - 5), 25, 'F');

        // Encabezado
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("SELCO Materiales Compuestos", pageWidth / 2, y, { align: "center" });
        y += lineHeight;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text("Teléfono: (+57) 123-456-7890 | Email: contacto@selco.com | www.selco.com", pageWidth / 2, y, { align: "center" });
        y += lineHeight + 5;

        // Título del documento
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("Cotización", pageWidth / 2, y, { align: "center" });
        y += lineHeight + 5;

        // Fecha de emisión
        const today = new Date();
        const fechaEmision = today.toISOString().split('T')[0];
        const fechaVencimiento = new Date(today);
        fechaVencimiento.setDate(today.getDate() + 15); // Validez de 15 días
        const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Fecha de Emisión: ${fechaEmision}`, pageWidth - margin, y, { align: "right" });
        y += lineHeight + 5;

        // Línea divisoria
        doc.setLineWidth(0.3);
        doc.setDrawColor(30, 58, 138);
        doc.line(margin, y, pageWidth - margin, y);
        y += lineHeight;

        // Detalles de la cotización
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("Detalles de la Cotización", margin, y);
        y += lineHeight + 2;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        doc.text(`Consecutivo: ${cot.consecutivo}`, margin, y);
        y += lineHeight;
        doc.text(`Cliente: ${cot.nombreCliente || 'Sin Cliente'}`, margin, y);
        y += lineHeight;
        doc.text(`Proyecto: ${cot.proyecto || 'Sin Proyecto'}`, margin, y);
        y += lineHeight;
        doc.text(`Descripción: ${cot.descripcion || 'Sin Descripción'}`, margin, y, { maxWidth: pageWidth - 2 * margin });
        y += lineHeight * 2;

        // Tabla de ítems unida con el resumen financiero
        const itemsData = cot.items.map(item => [
            item.descripcion || 'Sin Descripción',
            item.unidad || 'UND',
            (item.cantidad || 0).toFixed(2),
            formatCurrency(item.precioUnitario || 0, cot.moneda || 'COP'),
            formatCurrency((item.cantidad || 0) * (item.precioUnitario || 0), cot.moneda || 'COP')
        ]);

        // Calcular el resumen financiero
        const subtotal = cot.items.reduce((sum, i) => sum + (i.cantidad || 0) * (item.precioUnitario || 0), 0);
        const iva = subtotal * 0.19;
        const financialSummary = [
            ['Subtotal General', '', '', '', formatCurrency(subtotal, cot.moneda || 'COP')]
        ];

        if (cot.conAIU) {
            const administracion = (cot.administrativo / 100) * subtotal;
            const imprevistos = (cot.imprevistos / 100) * subtotal;
            const utilidad = (cot.utilidad / 100) * subtotal;
            const totalAIU = administracion + imprevistos + utilidad;

            financialSummary.push(['Administración', '', '', '', formatCurrency(administracion, cot.moneda || 'COP')]);
            financialSummary.push(['Imprevistos', '', '', '', formatCurrency(imprevistos, cot.moneda || 'COP')]);
            financialSummary.push(['Utilidad', '', '', '', formatCurrency(utilidad, cot.moneda || 'COP')]);
            financialSummary.push(['Total AIU', '', '', '', formatCurrency(totalAIU, cot.moneda || 'COP')]);
        }

        financialSummary.push(['IVA (19%)', '', '', '', formatCurrency(iva, cot.moneda || 'COP')]);
        financialSummary.push(['Total', '', '', '', formatCurrency(cot.precioTotal || 0, cot.moneda || 'COP')]);

        // Combinar ítems y resumen financiero en una sola tabla
        const combinedData = [...itemsData, ...financialSummary];

        doc.autoTable({
            head: [['Descripción', 'Unidad', 'Cantidad', 'Precio Unitario', 'Subtotal']],
            body: combinedData,
            startY: y,
            margin: { left: margin, right: margin },
            styles: { fontSize: 9, cellPadding: 2, textColor: [50, 50, 50], lineWidth: 0.1, lineColor: [150, 150, 150] },
            headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 20 },
                2: { cellWidth: 20 },
                3: { cellWidth: 30 },
                4: { cellWidth: 30 }
            },
            didParseCell: (data) => {
                // Fusionar celdas para el resumen financiero (columnas 3 y 4)
                if (data.row.index >= itemsData.length) {
                    if (data.column.index === 3) {
                        data.cell.colSpan = 2; // Fusionar las columnas 3 y 4
                        data.cell.styles.halign = 'right'; // Alinear a la derecha
                        data.cell.styles.fontStyle = 'bold'; // Negrita para el resumen
                    } else if (data.column.index === 4) {
                        data.cell.text = ''; // Vaciar la celda fusionada
                    }
                    // Vaciar las primeras tres columnas para el resumen financiero
                    if (data.column.index < 3) {
                        data.cell.text = '';
                    }
                }
            }
        });

        y = doc.lastAutoTable.finalY + 10;

        // Condiciones y tiempos en tabla enmarcada
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("Condiciones y Tiempos", margin, y);
        y += lineHeight + 2;

        const tiemposData = [
            ['Fecha de Creación', cot.fechaCreacion || 'No Especificada'],
            ['Fecha de Emisión', fechaEmision],
            ['Fecha de Vencimiento', `${fechaVencimientoStr} (Validez: 15 días)`],
            ['Importación', cot.importacion ? 'Sí' : 'No'],
            ['Tiempo de Importación', `${cot.tiempoImportacion || '0'} días`],
            ['Fecha de Llegada del Material', cot.fechaLlegadaMaterial || 'No Especificada'],
            ['Tiempo de Planeación', `${cot.tiempoPlaneacion || '0'} semanas`],
            ['Tiempo de Fabricación y Despacho', `${cot.tiempoFabricacionDespacho || '0'} semanas`],
            ['Tiempo de Instalación', `${cot.tiempoInstalacion || '0'} meses`],
            ['Fecha Final Estimada', cot.fechaFinal || 'No Especificada'],
            ['Forma de Pago', cot.formaPago || 'No Especificada'],
            ['Valor del Anticipo', formatCurrency(cot.valorAnticipo || 0, cot.moneda || 'COP')]
        ];

        doc.autoTable({
            head: [['Concepto', 'Valor']],
            body: tiemposData,
            startY: y,
            margin: { left: margin, right: margin },
            styles: { fontSize: 9, cellPadding: 2, textColor: [50, 50, 50], lineWidth: 0.2, lineColor: [100, 100, 100] },
            headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 100 }
            }
        });

        y = doc.lastAutoTable.finalY + 10;

        // Notas legales
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("Notas: Esta cotización es válida por 15 días a partir de la fecha de emisión. Precios sujetos a cambios sin previo aviso.", margin, y, { maxWidth: pageWidth - 2 * margin });

        // Pie de página con información adicional
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text("SELCO Materiales Compuestos | (+57) 123-456-7890 | contacto@selco.com", margin, pageHeight - margin + 2);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - margin + 2, { align: "right" });
        }

        doc.save(`cotizacion_${cot.consecutivo}.pdf`);
    } catch (error) {
        console.error('Error al generar PDF de cotización:', error);
        showToast('Error al generar PDF: ' + error.message);
    }
}

// Función para formatear moneda
function formatCurrency(value, currency) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currency || 'COP',
        minimumFractionDigits: 0
    }).format(value);
}

// Función para mostrar notificaciones
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Cargar cotizaciones al iniciar
document.addEventListener('DOMContentLoaded', cargarCotizaciones);
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
        showToast('Error al exportar cotizaciones: ' + error.message);
    }
}

function importarCotizaciones(files) {
    try {
        if (!files?.length) throw new Error('No se seleccionó archivo');
        const file = files[0];
        const reader = new FileReader();
        reader.onload = e => {
            const cotizaciones = JSON.parse(e.target.result);
            localStorage.setItem('cotizaciones', JSON.stringify(cotizaciones));
            filtrarCotizaciones();
            showToast('Cotizaciones importadas exitosamente.', 'success');
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Error al importar cotizaciones:', error);
        showToast('Error al importar cotizaciones: ' + error.message);
    }
}