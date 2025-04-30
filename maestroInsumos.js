function descargarPlantillaInsumos() {
    try {
        const wb = XLSX.utils.book_new();
        categorias.forEach(categoria => {
            const ws = XLSX.utils.aoa_to_sheet([["Descripción", "Unidad", "Precio Unitario"]]);
            XLSX.utils.book_append_sheet(wb, ws, categoria);
        });
        XLSX.writeFile(wb, "plantilla_insumos.xlsx");
    } catch (error) {
        console.error('Error al descargar plantilla de insumos:', error);
        showToast('Error al generar plantilla Excel: ' + error.message);
    }
}

function leerExcelInsumos(file) {
    try {
        if (!file) throw new Error('No se seleccionó archivo');
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border text-primary';
        document.querySelector('.maestro-insumos-content').appendChild(spinner);
        const reader = new FileReader();
        reader.onload = e => {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            categorias.forEach(categoria => {
                if (workbook.SheetNames.includes(categoria)) {
                    const wsData = XLSX.utils.sheet_to_json(workbook.Sheets[categoria], { header: 1 });
                    insertarInsumosDesdeExcel(categoria, wsData);
                }
            });
            guardarInsumos();
            spinner.remove();
        };
        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('Error al leer Excel de insumos:', error);
        showToast('Error al cargar archivo Excel: ' + error.message);
    }
}

function insertarInsumosDesdeExcel(categoria, data) {
    try {
        const tabla = document.getElementById(`tablaInsumos${categoria}`).getElementsByTagName('tbody')[0];
        tabla.innerHTML = '';
        for (let i = 1; i < data.length; i++) {
            if (data[i]?.length >= 3 && data[i][0]) {
                agregarFilaInsumoDesdeExcel(categoria, data[i][0], data[i][1], data[i][2]);
            }
        }
    } catch (error) {
        console.error(`Error al insertar insumos en ${categoria}:`, error);
        showToast(`Error al insertar insumos en ${categoria}: ${error.message}`);
    }
}

function agregarFilaInsumoDesdeExcel(categoria, descripcion, unidad, precioUnitario) {
    try {
        const tabla = document.getElementById(`tablaInsumos${categoria}`).getElementsByTagName('tbody')[0];
        const newRow = tabla.insertRow();
        const validUnidad = ['M2', 'ML', 'UND'].includes(unidad) ? unidad : 'UND';
        const validPrecio = parseFloat(precioUnitario) >= 0 ? parseFloat(precioUnitario) : 0;
        newRow.innerHTML = `
            <td><input type="text" class="editable descripcion" value="${descripcion || ''}" required></td>
            <td><select class="editable unidad">
                <option value="M2" ${validUnidad === 'M2' ? 'selected' : ''}>M2</option>
                <option value="ML" ${validUnidad === 'ML' ? 'selected' : ''}>ML</option>
                <option value="UND" ${validUnidad === 'UND' ? 'selected' : ''}>UND</option>
            </select></td>
            <td><input type="number" class="editable precioUnitarioInsumo" value="${validPrecio.toFixed(2)}" min="0" step="0.01" required></td>
            <td><button class="delete-btn" onclick="eliminarFilaInsumo(this, '${categoria}')" title="Eliminar insumo"><i class="fas fa-trash"></i></button></td>
        `;
        newRow.querySelectorAll('.editable').forEach(input => input.addEventListener('input', () => guardarInsumos()));
    } catch (error) {
        console.error(`Error al agregar insumo en ${categoria}:`, error);
        showToast(`Error al agregar insumo en ${categoria}: ${error.message}`);
    }
}

function agregarFilaInsumo(categoria) {
    try {
        const tabla = document.getElementById(`tablaInsumos${categoria}`).getElementsByTagName('tbody')[0];
        const newRow = tabla.insertRow();
        newRow.innerHTML = `
            <td><input type="text" class="editable descripcion" value="Nuevo Insumo" required></td>
            <td><select class="editable unidad">
                <option value="M2">M2</option>
                <option value="ML">ML</option>
                <option value="UND">UND</option>
            </select></td>
            <td><input type="number" class="editable precioUnitarioInsumo" value="0" min="0" step="0.01" required></td>
            <td><button class="delete-btn" onclick="eliminarFilaInsumo(this, '${categoria}')" title="Eliminar insumo"><i class="fas fa-trash"></i></button></td>
        `;
        newRow.querySelectorAll('.editable').forEach(input => input.addEventListener('input', () => guardarInsumos()));
        guardarInsumos();
    } catch (error) {
        console.error(`Error al agregar insumo en ${categoria}:`, error);
        showToast(`Error al agregar insumo: ${error.message}`);
    }
}

function eliminarFilaInsumo(button, categoria) {
    try {
        button.closest('tr').remove();
        guardarInsumos();
    } catch (error) {
        console.error(`Error al eliminar insumo en ${categoria}:`, error);
        showToast(`Error al eliminar insumo: ${error.message}`);
    }
}

function guardarInsumos() {
    try {
        const insumos = categorias.reduce((acc, cat) => {
            acc[cat] = [];
            const tabla = document.getElementById(`tablaInsumos${cat}`).getElementsByTagName('tbody')[0];
            for (let row of tabla.rows) {
                const descripcion = row.cells[0].querySelector('input').value;
                if (descripcion) {
                    acc[cat].push({
                        descripcion,
                        unidad: row.cells[1].querySelector('select').value,
                        precioUnitario: parseFloat(row.cells[2].querySelector('input').value) || 0
                    });
                }
            }
            return acc;
        }, {});
        localStorage.setItem('insumos', JSON.stringify(insumos));
    } catch (error) {
        console.error('Error al guardar insumos:', error);
        showToast('Error al guardar insumos: ' + error.message);
    }
}

function cargarInsumos() {
    try {
        const insumos = JSON.parse(localStorage.getItem('insumos') || '{}');
        categorias.forEach(categoria => {
            const tabla = document.getElementById(`tablaInsumos${categoria}`).getElementsByTagName('tbody')[0];
            tabla.innerHTML = '';
            if (insumos[categoria]) {
                insumos[categoria].forEach(insumo => {
                    agregarFilaInsumoDesdeExcel(categoria, insumo.descripcion, insumo.unidad, insumo.precioUnitario);
                });
            }
        });
    } catch (error) {
        console.error('Error al cargar insumos:', error);
        showToast('Error al cargar insumos: ' + error.message);
    }
}