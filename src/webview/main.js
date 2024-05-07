import { ENTITIES } from '../web/entities.js'

const vscode = acquireVsCodeApi();

function convertToFigureMapper(i) {
    const { name, entity, hex, categories } = i;
    return `<figure data-entity="${name}" data-categories="${categories.join(' ')}" title="Name: ${name}\nHex: ${hex}"><span style="user-select: none !important;">${entity}</span><figcaption>${entity.replace('&', '&amp;')}</figcaption></figure>`
}

const DOM_ELEMENTS = {
    MAIN: document.querySelector('main'),
    DIV_CATEGORIES: document.getElementById('categories'),
    SELECT_SORT: document.getElementById('select_sort')
}

const CACHED_HTML = {
    NAME_ASC: ENTITIES.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLocaleLowerCase())).map(convertToFigureMapper).join(''),
    NAME_DESC: ENTITIES.sort((a, b) => b.name.toLocaleLowerCase().localeCompare(a.name.toLocaleLowerCase())).map(convertToFigureMapper).join(''),
    DEC_ASC: ENTITIES.sort((a, b) => a.decimals - b.decimals).map(convertToFigureMapper).join(''),
    DEC_DESC: ENTITIES.sort((a, b) => b.decimals - a.decimals).map(convertToFigureMapper).join('')
}

const CATEGORIES = [...new Set(ENTITIES.flatMap(i => i.categories))].sort()
DOM_ELEMENTS.DIV_CATEGORIES.innerHTML += CATEGORIES.map(i => `<label class="checkbox"><input class="checkbox" type="checkbox" value="${i}" name="categories"/>${i}<span class="checkmark"></span></label>`).join('')

function refresh(sortBy) {
    switch (sortBy.toLowerCase()) {
        case 'desc': {
            DOM_ELEMENTS.MAIN.innerHTML = CACHED_HTML.NAME_DESC;
            break;
        }
        case 'decimal_asc': {
            DOM_ELEMENTS.MAIN.innerHTML = CACHED_HTML.DEC_ASC;
            break;
        }
        case 'decimal_desc': {
            DOM_ELEMENTS.MAIN.innerHTML = CACHED_HTML.DEC_DESC;
            break;
        }
        default: {
            DOM_ELEMENTS.MAIN.innerHTML = CACHED_HTML.NAME_ASC;
            break;
        }
    }

    const categories = [...DOM_ELEMENTS.DIV_CATEGORIES.querySelectorAll('#categories input:checked')].map(i => `:not([data-categories~="${i.value}"])`);
    if (categories.length > 0) {
        document.querySelectorAll(`main figure${categories.join('')}`).forEach(e => e.style.display = 'none')
    }
}

DOM_ELEMENTS.DIV_CATEGORIES.querySelectorAll('input[name="categories"]').forEach(i => {
    i.addEventListener('change', () => refresh(DOM_ELEMENTS.SELECT_SORT.selectedOptions[0].value))
})

DOM_ELEMENTS.SELECT_SORT.addEventListener('change', ({ target }) => {
    refresh(target.selectedOptions[0].value);
});

refresh('asc')

DOM_ELEMENTS.MAIN.addEventListener('click', ({target}) => {
    if (!target) return

    const figure = target.closest('figure');
    if (!figure) return;

    const selected_inserttype = document.querySelector('#actions input[name="inserttype"]:checked').value;
    const entity = ENTITIES.find(i => i.name === figure.getAttribute('data-entity'));

    if (entity && typeof vscode !== 'undefined')
        vscode.postMessage({ event: 'selected', entity, it: selected_inserttype });
    else {
        console.debug(selected_inserttype, entity);
    }
})

