const templates = {
    "Venta de Suministro": {
        name: "Venta de Suministro (Simple)",
        complexity: "simple",
        data: [
            { categoria: "Materiales", descripcion: "Lámina de ACM 4mm", unidad: "UND", cantidad: 1, precioUnitario: 1000000 },
            
        ]
    },
    "Proyectos Menores a 500 M2": {
        name: "Proyectos Menores a 500 M2 (Media)",
        complexity: "medium",
        data: [
            { categoria: "Materiales", descripcion: "Viga de Acero HEA 200", unidad: "ML", cantidad: 1, precioUnitario: 120000 },
            { categoria: "Materiales", descripcion: "Placa de Acero 10mm", unidad: "M2", cantidad: 1, precioUnitario: 180000 },
            { categoria: "ManoObra", descripcion: "Soldadura Estructural", unidad: "ML", cantidad: 1, precioUnitario: 60000 },
            { categoria: "HerramientasEquipos", descripcion: "Grúa 10T", unidad: "UND", cantidad: 1, precioUnitario: 500000 },
            { categoria: "LogisticaTransporte", descripcion: "Transporte Materiales", unidad: "UND", cantidad: 1, precioUnitario: 300000 }
        ]
    },
    "Proyectos Superiores a 500 M2a": {
        name: "Proyectos Superiores a 500 M2a (Compleja)",
        complexity: "complex",
        data: [
            { categoria: "Materiales", descripcion: "Cable Eléctrico 12 AWG", unidad: "ML", cantidad: 100, precioUnitario: 5000 },
            { categoria: "Materiales", descripcion: "Tablero Eléctrico 24 Circuitos", unidad: "UND", cantidad: 1, precioUnitario: 800000 },
            { categoria: "Materiales", descripcion: "Interruptores 20A", unidad: "UND", cantidad: 10, precioUnitario: 15000 },
            { categoria: "ManoObra", descripcion: "Instalación Cableado", unidad: "ML", cantidad: 100, precioUnitario: 10000 },
            { categoria: "ManoObra", descripcion: "Montaje Tablero", unidad: "UND", cantidad: 1, precioUnitario: 200000 },
            { categoria: "SST", descripcion: "Equipo de Seguridad Eléctrica", unidad: "UND", cantidad: 5, precioUnitario: 50000 },
            { categoria: "HerramientasEquipos", descripcion: "Multímetro Digital", unidad: "UND", cantidad: 1, precioUnitario: 150000 },
            { categoria: "LogisticaTransporte", descripcion: "Flete Equipos", unidad: "UND", cantidad: 1, precioUnitario: 200000 }
        ]
    }
};

function descargarPlantilla() {
    try {
        const wb = XLSX.utils.book_new();
        categorias.forEach(categoria => {
            const ws = XLSX.utils.aoa_to_sheet([["Descripción", "Unidad", "Cantidad", "Precio Unitario"]]);
            XLSX.utils.book_append_sheet(wb, ws, categoria);
        });
        XLSX.writeFile(wb, "plantilla_apu.xlsx");
    } catch (error) {
        console.error('Error al descargar plantilla:', error);
        showToast('Error al generar plantilla Excel: ' + error.message);
    }
}

function leerExcel(file) {
    try {
        if (!file) throw new Error('No se seleccionó archivo');
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border text-primary';
        document.querySelector('.calculadora-content').appendChild(spinner);
        const reader = new FileReader();
        reader.onload = e => {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            categorias.forEach(categoria => {
                if (workbook.SheetNames.includes(categoria)) {
                    const wsData = XLSX.utils.sheet_to_json(workbook.Sheets[categoria], { header: 1 });
                    insertarDatosDesdeExcel(categoria, wsData);
                }
            });
            calcularAPU();
            spinner.remove();
        };
        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('Error al leer Excel:', error);
        showToast('Error al cargar archivo Excel: ' + error.message);
    }
}

function insertarDatosDesdeExcel(categoria, data) {
    try {
        const tabla = document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0];
        tabla.innerHTML = '';
        for (let i = 1; i < data.length; i++) {
            if (data[i]?.length >= 4 && data[i][0]) {
                agregarFilaDesdeExcel(categoria, data[i][0], data[i][1], data[i][2], data[i][3]);
            }
        }
    } catch (error) {
        console.error(`Error al insertar datos en ${categoria}:`, error);
        showToast(`Error al insertar datos en ${categoria}: ${error.message}`);
    }
}

function agregarFilaDesdeExcel(categoria, descripcion, unidad, cantidad, precioUnitario) {
    try {
        const tabla = document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0];
        const newRow = tabla.insertRow();
        const validUnidad = ['M2', 'ML', 'UND'].includes(unidad) ? unidad : 'UND';
        const validCantidad = parseFloat(cantidad) >= 0 ? parseFloat(cantidad) : 0;
        const validPrecio = parseFloat(precioUnitario) >= 0 ? parseFloat(precioUnitario) : 0;
        newRow.innerHTML = `
            <td><input type="text" class="editable descripcion" value="${descripcion || ''}" required></td>
            <td><select class="editable unidad">
                <option value="M2" ${validUnidad === 'M2' ? 'selected' : ''}>M2</option>
                <option value="ML" ${validUnidad === 'ML' ? 'selected' : ''}>ML</option>
                <option value="UND" ${validUnidad === 'UND' ? 'selected' : ''}>UND</option>
            </select></td>
            <td><input type="number" class="editable cantidad${categoria}" value="${validCantidad.toFixed(2)}" min="0" step="0.01" required></td>
            <td><input type="number" class="editable precioUnitario${categoria}" value="${validPrecio.toFixed(2)}" min="0" step="0.01" required></td>
            <td class="subtotal${categoria}"></td>
            <td><button class="delete-btn" onclick="eliminarFila(this, '${categoria}')" title="Eliminar fila"><i class="fas fa-trash"></i></button></td>
        `;
        inicializarChoicesCalculadora(newRow.querySelector('.descripcion'), categoria);
        newRow.querySelectorAll('.editable').forEach(input => input.addEventListener('input', calcularAPU));
        calcularAPU();
    } catch (error) {
        console.error(`Error al agregar fila en ${categoria}:`, error);
        showToast(`Error al agregar fila en ${categoria}: ${error.message}`);
    }
}

function agregarFila(categoria) {
    try {
        const tabla = document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0];
        const newRow = tabla.insertRow();
        newRow.innerHTML = `
            <td><input type="text" class="editable descripcion" value="Nuevo ${categoria}" required></td>
            <td><select class="editable unidad">
                <option value="M2">M2</option>
                <option value="ML">ML</option>
                <option value="UND">UND</option>
            </select></td>
            <td><input type="number" class="editable cantidad${categoria}" value="0" min="0" step="0.01" required></td>
            <td><input type="number" class="editable precioUnitario${categoria}" value="0" min="0" step="0.01" required></td>
            <td class="subtotal${categoria}"></td>
            <td><button class="delete-btn" onclick="eliminarFila(this, '${categoria}')" title="Eliminar fila"><i class="fas fa-trash"></i></button></td>
        `;
        inicializarChoicesCalculadora(newRow.querySelector('.descripcion'), categoria);
        newRow.querySelectorAll('.editable').forEach(input => input.addEventListener('input', calcularAPU));
        calcularAPU();
    } catch (error) {
        console.error(`Error al agregar fila en ${categoria}:`, error);
        showToast(`Error al agregar fila: ${error.message}`);
    }
}

function inicializarChoicesCalculadora(element, categoria) {
    try {
        if (typeof Choices !== 'undefined') {
            const insumos = JSON.parse(localStorage.getItem('insumos') || '{}')[categoria] || [];
            const choices = new Choices(element, {
                choices: insumos.map(i => ({ value: i.descripcion, label: i.descripcion, customProperties: { unidad: i.unidad, precioUnitario: i.precioUnitario } })),
                allowHTML: false,
                addItems: true,
                placeholderValue: 'Seleccione o escriba un insumo',
            });
            choices.passedElement.element.addEventListener('change', e => {
                const selected = insumos.find(i => i.descripcion === e.detail.value);
                if (selected) {
                    const row = element.closest('tr');
                    row.querySelector('.unidad').value = selected.unidad;
                    row.querySelector(`.precioUnitario${categoria}`).value = selected.precioUnitario.toFixed(2);
                    calcularAPU();
                }
            });
            choices.passedElement.element.addEventListener('addItem', e => {
                const descripciones = JSON.parse(localStorage.getItem('descripciones') || '[]');
                if (!descripciones.includes(e.detail.value)) {
                    descripciones.push(e.detail.value);
                    localStorage.setItem('descripciones', JSON.stringify(descripciones));
                }
            });
        }
    } catch (error) {
        console.error(`Error al inicializar Choices.js en ${categoria}:`, error);
        showToast(`Error al inicializar selector de insumos: ${error.message}`);
    }
}

function eliminarFila(button, categoria) {
    try {
        button.closest('tr').remove();
        calcularAPU();
    } catch (error) {
        console.error(`Error al eliminar fila en ${categoria}:`, error);
        showToast(`Error al eliminar fila: ${error.message}`);
    }
}

function calcularAPU() {
    try {
        const margen = parseFloat(document.getElementById('margen_contributivo').value) || 0;
        if (margen < 0 || margen > 99) {
            document.getElementById('margenError').classList.add('active');
            document.getElementById('margenError').textContent = 'El margen debe estar entre 0 y 99.';
            return;
        }
        document.getElementById('margenError').classList.remove('active');

        let totalGeneral = 0;
        const resultados = categorias.reduce((acc, categoria) => {
            let totalCategoria = 0;
            const tabla = document.getElementById(`tabla${categoria}`);
            const filas = tabla.getElementsByTagName('tbody')[0].rows;
            for (let fila of filas) {
                const cantidad = parseFloat(fila.querySelector(`.cantidad${categoria}`).value) || 0;
                const precio = parseFloat(fila.querySelector(`.precioUnitario${categoria}`).value) || 0;
                const subtotal = cantidad * precio;
                fila.querySelector(`.subtotal${categoria}`).textContent = formatCurrency(subtotal);
                totalCategoria += subtotal;
            }
            totalGeneral += totalCategoria;
            acc[categoria] = totalCategoria;
            document.getElementById(`total${categoria}`).textContent = formatCurrency(totalCategoria);
            document.getElementById(`porcentaje${categoria}`).textContent = totalGeneral > 0 ? ((totalCategoria / totalGeneral) * 100).toFixed(2) + '%' : '0%';
            return acc;
        }, {});

        const precioUnitario = totalGeneral * (1 + margen / 100);
        document.getElementById('resultado').textContent = formatCurrency(precioUnitario);
        localStorage.setItem('apuResultados', JSON.stringify({ totales: resultados, precioUnitario }));
    } catch (error) {
        console.error('Error al calcular APU:', error);
        showToast('Error al calcular APU: ' + error.message);
    }
}

function usarEnCotizacion() {
    try {
        const apuResultados = JSON.parse(localStorage.getItem('apuResultados') || '{}');
        if (!apuResultados.precioUnitario) throw new Error('No hay resultados de APU disponibles.');
        const tabla = document.getElementById('tablaItemsCotizacion').getElementsByTagName('tbody')[0];
        const newRow = tabla.insertRow();
        newRow.innerHTML = `
            <td><input type="text" class="editable descripcion" value="APU Calculado" required></td>
            <td><select class="editable unidad">
                <option value="UND">UND</option>
                <option value="M2">M2</option>
                <option value="ML">ML</option>
            </select></td>
            <td><input type="number" class="editable cantidad" value="1" min="0" step="0.01" required></td>
            <td><input type="number" class="editable precioUnitario" value="${apuResultados.precioUnitario.toFixed(2)}" min="0" step="0.01" required></td>
            <td class="subtotal"></td>
            <td><button class="delete-btn" onclick="eliminarItemCotizacion(this)" title="Eliminar ítem"><i class="fas fa-trash"></i></button></td>
        `;
        newRow.querySelectorAll('.editable').forEach(input => input.addEventListener('input', calcularCotizacion));
        calcularCotizacion();
        showToast('APU transferido a Cotización exitosamente.', 'success');
        openTab('cotizacion');
    } catch (error) {
        console.error('Error al usar en cotización:', error);
        showToast('Error al transferir APU a Cotización: ' + error.message);
    }
}

function descargarPDFCalculadora() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Constantes para el diseño
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const lineHeight = 7;
        let y = margin;

        // Encabezado
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("SELCO Materiales Compuestos", pageWidth / 2, y, { align: "center" });
        y += lineHeight;

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("Análisis de Precio Unitario (APU)", pageWidth / 2, y, { align: "center" });
        y += lineHeight;

        // Fecha
        const today = new Date().toISOString().split('T')[0];
        doc.setFontSize(10);
        doc.text(`Fecha: ${today}`, pageWidth - margin, y, { align: "right" });
        y += lineHeight * 2;

        // Tablas para cada categoría
        categorias.forEach((categoria, index) => {
            const tabla = document.getElementById(`tabla${categoria}`);
            const filas = tabla.getElementsByTagName('tbody')[0].rows;
            if (filas.length > 0) {
                // Título de la categoría
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(categoria, margin, y);
                y += lineHeight;

                // Tabla
                const data = Array.from(filas).map(fila => [
                    fila.cells[0].querySelector('input').value,
                    fila.cells[1].querySelector('select').value,
                    fila.cells[2].querySelector('input').value,
                    formatCurrency(parseFloat(fila.cells[3].querySelector('input').value) || 0, 'COP'),
                    fila.cells[4].textContent
                ]);

                doc.autoTable({
                    head: [['Descripción', 'Unidad', 'Cantidad', 'Precio Unitario', 'Subtotal']],
                    body: data,
                    startY: y,
                    margin: { left: margin, right: margin },
                    styles: { fontSize: 10, cellPadding: 2 },
                    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
                    alternateRowStyles: { fillColor: [240, 240, 240] },
                    columnStyles: {
                        0: { cellWidth: 60 },
                        1: { cellWidth: 20 },
                        2: { cellWidth: 20 },
                        3: { cellWidth: 30 },
                        4: { cellWidth: 30 }
                    }
                });

                y = doc.lastAutoTable.finalY + 5;
                doc.setFontSize(10);
                doc.text(`Total ${categoria}: ${document.getElementById(`total${categoria}`).textContent}`, margin, y);
                y += lineHeight;

                // Agregar salto de página si el contenido excede la altura de la página
                if (y > pageHeight - 40 && index < categorias.length - 1) {
                    doc.addPage();
                    y = margin;
                }
            }
        });

        // Precio final
        y += lineHeight;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Precio Unitario Total: ${document.getElementById('resultado').textContent}`, margin, y);

        // Pie de página con números de página
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - margin, { align: "right" });
        }

        doc.save('apu_calculadora.pdf');
    } catch (error) {
        console.error('Error al generar PDF:', error);
        showToast('Error al generar PDF: ' + error.message);
    }
}

function descargarJSON() {
    try {
        const data = categorias.reduce((acc, categoria) => {
            const filas = document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0].rows;
            acc[categoria] = [];
            for (let fila of filas) {
                acc[categoria].push({
                    descripcion: fila.cells[0].querySelector('input').value,
                    unidad: fila.cells[1].querySelector('select').value,
                    cantidad: parseFloat(fila.cells[2].querySelector('input').value) || 0,
                    precioUnitario: parseFloat(fila.cells[3].querySelector('input').value) || 0
                });
            }
            return acc;
        }, {});
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'apu_data.json';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error al descargar JSON:', error);
        showToast('Error al generar JSON: ' + error.message);
    }
}

function cargarJSON(files) {
    try {
        if (!files?.length) throw new Error('No se seleccionó archivo');
        const file = files[0];
        const reader = new FileReader();
        reader.onload = e => {
            const data = JSON.parse(e.target.result);
            categorias.forEach(categoria => {
                if (data[categoria]) {
                    const tabla = document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0];
                    tabla.innerHTML = '';
                    data[categoria].forEach(item => {
                        agregarFilaDesdeExcel(categoria, item.descripcion, item.unidad, item.cantidad, item.precioUnitario);
                    });
                }
            });
            calcularAPU();
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Error al cargar JSON:', error);
        showToast('Error al cargar JSON: ' + error.message);
    }
}

function cargarPlantilla(plantillaId) {
    try {
        if (!plantillaId) return;

        // Obtener plantillas personalizadas desde localStorage
        const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '{}');
        const selectedTemplate = templates[plantillaId] || customTemplates[plantillaId];

        if (!selectedTemplate) throw new Error('Plantilla no encontrada');

        // Limpiar tablas
        categorias.forEach(categoria => {
            document.getElementById(`tabla${categoria}`).getElementsByTagName('tbody')[0].innerHTML = '';
        });

        // Cargar datos de la plantilla
        selectedTemplate.data.forEach(item => {
            agregarFilaDesdeExcel(item.categoria, item.descripcion, item.unidad, item.cantidad, item.precioUnitario);
        });

        calcularAPU();
        showToast(`Plantilla "${selectedTemplate.name}" cargada exitosamente.`, 'success');
    } catch (error) {
        console.error('Error al cargar plantilla:', error);
        showToast('Error al cargar plantilla: ' + error.message);
    }
}

function guardarPlantillaPersonalizada(nombre, complejidad, datos) {
    try {
        const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '{}');
        const plantillaId = nombre.toLowerCase().replace(/\s+/g, '_');
        customTemplates[plantillaId] = {
            name: nombre,
            complexity: complejidad,
            data: datos
        };
        localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
        actualizarListaPlantillas();
        showToast(`Plantilla "${nombre}" guardada exitosamente.`, 'success');
    } catch (error) {
        console.error('Error al guardar plantilla personalizada:', error);
        showToast('Error al guardar plantilla: ' + error.message);
    }
}

function eliminarPlantillaPersonalizada(plantillaId) {
    try {
        const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '{}');
        if (customTemplates[plantillaId]) {
            delete customTemplates[plantillaId];
            localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
            actualizarListaPlantillas();
            showToast('Plantilla eliminada exitosamente.', 'success');
        } else {
            throw new Error('Plantilla no encontrada');
        }
    } catch (error) {
        console.error('Error al eliminar plantilla:', error);
        showToast('Error al eliminar plantilla: ' + error.message);
    }
}

function actualizarListaPlantillas() {
    try {
        const select = document.getElementById('plantilla');
        select.innerHTML = '<option value="">Seleccionar Plantilla</option>';

        // Añadir plantillas predefinidas
        Object.keys(templates).forEach(key => {
            const template = templates[key];
            const option = document.createElement('option');
            option.value = key;
            option.textContent = template.name;
            select.appendChild(option);
        });

        // Añadir plantillas personalizadas
        const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '{}');
        Object.keys(customTemplates).forEach(key => {
            const template = customTemplates[key];
            const option = document.createElement('option');
            option.value = key;
            option.textContent = template.name + ' (Personalizada)';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al actualizar lista de plantillas:', error);
        showToast('Error al actualizar lista de plantillas: ' + error.message);
    }
}

function abrirEditorPlantillas() {
    try {
        const modal = document.getElementById('modalEditorPlantillas');
        modal.style.display = 'block';
        cargarPlantillasEnEditor();
    } catch (error) {
        console.error('Error al abrir editor de plantillas:', error);
        showToast('Error al abrir editor: ' + error.message);
    }
}

function cargarPlantillasEnEditor() {
    try {
        const lista = document.getElementById('listaPlantillasEditor');
        lista.innerHTML = '';
        const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '{}');
        Object.keys(customTemplates).forEach(key => {
            const template = customTemplates[key];
            const li = document.createElement('li');
            li.innerHTML = `
                ${template.name} (${template.complexity})
                <button class="action-btn" onclick="editarPlantilla('${key}')">Editar</button>
                <button class="delete-btn" onclick="eliminarPlantillaPersonalizada('${key}')">Eliminar</button>
            `;
            lista.appendChild(li);
        });
    } catch (error) {
        console.error('Error al cargar plantillas en editor:', error);
        showToast('Error al cargar plantillas: ' + error.message);
    }
}

function editarPlantilla(plantillaId) {
    try {
        const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '{}');
        const template = customTemplates[plantillaId];
        if (!template) throw new Error('Plantilla no encontrada');

        document.getElementById('nombrePlantilla').value = template.name;
        document.getElementById('complejidadPlantilla').value = template.complexity;
        const datosPlantilla = document.getElementById('datosPlantilla');
        datosPlantilla.innerHTML = '';
        template.data.forEach((item, index) => {
            const div = document.createElement('div');
            div.innerHTML = `
                <select name="categoria_${index}">
                    ${categorias.map(cat => `<option value="${cat}" ${item.categoria === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                </select>
                <input type="text" name="descripcion_${index}" value="${item.descripcion}" required>
                <select name="unidad_${index}">
                    <option value="M2" ${item.unidad === 'M2' ? 'selected' : ''}>M2</option>
                    <option value="ML" ${item.unidad === 'ML' ? 'selected' : ''}>ML</option>
                    <option value="UND" ${item.unidad === 'UND' ? 'selected' : ''}>UND</option>
                </select>
                <input type="number" name="cantidad_${index}" value="${item.cantidad}" min="0" step="0.01" required>
                <input type="number" name="precioUnitario_${index}" value="${item.precioUnitario}" min="0" step="0.01" required>
                <button type="button" onclick="this.parentElement.remove()">Eliminar</button>
            `;
            datosPlantilla.appendChild(div);
        });

        document.getElementById('formEditorPlantillas').onsubmit = e => {
            e.preventDefault();
            const nombre = document.getElementById('nombrePlantilla').value;
            const complejidad = document.getElementById('complejidadPlantilla').value;
            const datos = Array.from(datosPlantilla.children).map(div => ({
                categoria: div.querySelector(`select[name^="categoria_"]`).value,
                descripcion: div.querySelector(`input[name^="descripcion_"]`).value,
                unidad: div.querySelector(`select[name^="unidad_"]`).value,
                cantidad: parseFloat(div.querySelector(`input[name^="cantidad_"]`).value),
                precioUnitario: parseFloat(div.querySelector(`input[name^="precioUnitario_"]`).value)
            }));
            guardarPlantillaPersonalizada(nombre, complejidad, datos);
            cerrarEditorPlantillas();
        };
    } catch (error) {
        console.error('Error al editar plantilla:', error);
        showToast('Error al editar plantilla: ' + error.message);
    }
}

function cerrarEditorPlantillas() {
    try {
        const modal = document.getElementById('modalEditorPlantillas');
        modal.style.display = 'none';
    } catch (error) {
        console.error('Error al cerrar editor:', error);
        showToast('Error al cerrar editor: ' + error.message);
    }
}

// Inicializar lista de plantillas al cargar la página
document.addEventListener('DOMContentLoaded', actualizarListaPlantillas);