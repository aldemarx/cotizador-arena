> ⚠️ **Referencia histórica.** Este análisis se escribió antes de recibir la data real
> del cliente. Los datos, fórmulas y calendario vigentes están en
> [contexto-simulador-altos-de-sacta.md](contexto-simulador-altos-de-sacta.md), que es
> la fuente oficial que implementa el simulador.

# Análisis Estratégico: Simulador de Precios y Fraccionamiento en Vivo

**Cliente:** Inmobiliaria de terrenos
**Uso:** Presentación en transmisión en vivo (live)
**Objetivo:** Lanzar un nuevo modelo de fraccionamiento con cuotas escalonadas (ascendentes o descendentes) y mostrarlo frente al fraccionamiento tradicional.

---

## 1. Contexto y objetivo

La inmobiliaria vende terrenos financiados con fraccionamiento directo. Hoy el cliente paga una **cuota fija** durante todo el plazo. La propuesta es presentar en un live un **modelo nuevo**:

- **Ascendente:** el cliente empieza pagando menos y la cuota sube conforme avanza. Reduce la barrera de entrada.
- **Descendente (inverso):** el cliente empieza pagando más y la cuota baja con el tiempo. Termina "liviano".

El simulador debe permitir elegir la **ubicación del terreno** y mostrar en el acto su **precio**, su **fraccionamiento por defecto** y la comparación con los modelos nuevos.

El valor comercial está en el impacto visual: que el público vea en segundos que puede entrar con una cuota mucho menor.

---

## 2. Flujo del simulador en pantalla

El flujo debe ser corto, porque la audiencia lo sigue en tiempo real.

1. **Seleccionar ubicación:** Proyecto → Manzana → Lote. Se muestran automáticamente el área (m²) y el precio.
2. **Inicial:** se precarga la inicial mínima y se puede ajustar en vivo.
3. **Plazo:** por ejemplo 12, 24, 36 o 48 meses, según la política de la empresa.
4. **Comparación de tres modelos lado a lado:**
   - **Clásico:** fraccionamiento actual, con cuota fija.
   - **Escalonado ascendente:** cuota baja al inicio que sube por tramos.
   - **Escalonado descendente:** cuota alta al inicio que baja por tramos.
5. **Gráfico de barras** con la cuota mes a mes, para que la "escalera" se vea al instante.

---

## 3. Lógica matemática

### 3.1 Variables

| Variable | Descripción |
|---|---|
| `P` | Precio del terreno |
| `I` | Inicial |
| `F = P − I` | Monto a financiar |
| `n` | Número de cuotas (meses) |
| `T` | Número de tramos (ej. 3 tramos de 12 meses) |
| `w₁, w₂, …, w_T` | Peso de cada tramo respecto a la cuota clásica |

### 3.2 Modelo clásico (actual)

```
Cuota fija = F / n
```

### 3.3 Modelo escalonado por tramos (recomendado)

Recomendamos **tramos anuales** en vez de subir la cuota cada mes, porque es mucho más fácil de explicar en vivo: *"el primer año pagas S/ 970, el segundo S/ 1,390…"*.

```
Cuota base  = F / n
Cuota tramo = Cuota base × w_t
Condición: el promedio de los pesos debe ser 1 → (w₁ + w₂ + … + w_T) / T = 1
```

Con esta condición, **el total pagado es exactamente igual al del modelo clásico**. Solo cambia cómo se reparte en el tiempo.

- **Ascendente:** pesos crecientes (ej. 70% / 100% / 130%).
- **Descendente:** los mismos pesos invertidos (ej. 130% / 100% / 70%).

### 3.4 Si el fraccionamiento tiene interés

Si la empresa cobra interés, el cálculo se ajusta para que el **valor presente** de las cuotas escalonadas sea igual al monto financiado a la tasa pactada. En ese caso el total pagado en el modelo ascendente será algo mayor que en el clásico (porque se paga más tarde), y en el descendente algo menor. **Esto está pendiente de confirmar.**

---

## 4. Ejemplo numérico

Terreno de **S/ 60,000**, inicial de **S/ 10,000**, monto a financiar de **S/ 50,000**, plazo de **36 meses** en 3 tramos de 12 meses, sin interés.

| Modelo | Año 1 (mes 1–12) | Año 2 (mes 13–24) | Año 3 (mes 25–36) | Total financiado |
|---|---|---|---|---|
| Clásico | S/ 1,388.89 | S/ 1,388.89 | S/ 1,388.89 | S/ 50,000 |
| Ascendente (70 / 100 / 130) | S/ 972.22 | S/ 1,388.89 | S/ 1,805.56 | S/ 50,000 |
| Descendente (130 / 100 / 70) | S/ 1,805.56 | S/ 1,388.89 | S/ 972.22 | S/ 50,000 |

**Mensaje para el live:** *"Con el modelo ascendente empiezas pagando S/ 416 menos al mes durante todo el primer año."*

---

## 5. Puntos estratégicos a cuidar

### 5.1 Flujo de caja de la empresa
Con el modelo ascendente la empresa cobra menos al inicio. Conviene fijar un **piso**, por ejemplo que la primera cuota no baje del 60% de la cuota clásica.

### 5.2 Riesgo de morosidad
El cliente que entra "justo" puede tener problemas cuando la cuota suba. Para mitigarlo:
- Poner un **tope de incremento por tramo** (ej. máximo +30% por año).
- Hacer una evaluación simple de capacidad de pago para el tramo más alto.
- Dejar muy claro en el contrato y en el live cuánto será la cuota final.

### 5.3 El descendente como argumento de venta
- Sirve para quien espera que sus ingresos bajen o quiere "liberarse rápido".
- **Reduce el riesgo para la empresa**, porque cobra más al inicio. Se podría incentivar con un pequeño descuento o beneficio.

### 5.4 Transparencia
Mostrar siempre el **total a pagar** junto a la cuota. Evita reclamos y genera confianza, algo clave en venta de terrenos.

### 5.5 Nombres comerciales sugeridos
Los nombres venden mejor que los términos técnicos como "escalonado":
- Ascendente: **"Cuota Crece Contigo"** / **"Empieza Ligero"**
- Descendente: **"Cuota Liviana al Final"** / **"Termina Libre"**

---

## 6. Diseño para el live

- **Números grandes** y alto contraste, legibles en celular.
- **Fondo oscuro**, que se ve mejor en transmisión.
- **Todo en una sola pantalla**, sin scroll.
- **Botón "modo presentación"** que oculta los controles y deja solo el resultado.
- **Precios editables rápido** por si se lanza una promoción durante el live.
- **Identidad de marca:** logo y colores de la inmobiliaria.
- **Llamado a la acción** visible (WhatsApp / número de contacto).

---

## 7. Información pendiente del cliente

| # | Dato | Estado |
|---|---|---|
| 1 | Lista de lotes: proyecto, manzana, lote, área y precio (Excel o tabla) | Pendiente |
| 2 | Fraccionamiento actual: inicial mínima y plazos disponibles | Pendiente |
| 3 | ¿Cobran interés? Si es así, ¿qué tasa? | Pendiente |
| 4 | Reglas del nuevo modelo: número de tramos y variación (o usar 70/100/130 propuesto) | Pendiente |
| 5 | Logo, colores y datos de contacto | Pendiente |

---

## 8. Próximos pasos

1. El cliente envía la información de la sección 7.
2. Se construye el simulador como **página web** que se abre en el navegador y se comparte en pantalla durante el live.
3. Prueba interna con 3 a 5 lotes reales para validar los montos.
4. Ensayo del live con el presentador (flujo de clics y mensajes clave).
5. Lanzamiento en vivo.
