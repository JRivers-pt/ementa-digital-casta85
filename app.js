// Casta 85 - Ementa Digital - Lógica da Aplicação (Integração Google Sheets)

// ==========================================
// CONFIGURAÇÃO DO GOOGLE SHEETS
// ==========================================
// Insira aqui o link CSV público do seu Google Sheets.
// Como obter este link:
// 1. No Google Sheets, vá a Ficheiro -> Partilhar -> Publicar na Web.
// 2. Selecione "Valores separados por vírgulas (.csv)" e clique em Publicar.
// 3. Cole o link copiado entre as aspas abaixo.
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSamCHuz_7wbzgwjplpAOQpFjzHud2wQagDE_o9-FcG-UJDi8PGNfUHMU8rTj_Zomu-p6KQ52yitxTu/pub?output=csv'; 

// ==========================================
// ESTADO GLOBAL
// ==========================================
let currentLanguage = 'pt';
let activeFilter = 'all';
let currentTable = '--';
let currentModalItem = null;

// Dicionário de Tradução dos Elementos da UI
const translations = {
    pt: {
        welcome: "Seja bem-vindo ao Casta 85. Faça a sua escolha comodamente.",
        callWaiter: "Chamar Empregado",
        waiterToastTitle: "Chamada Efetuada!",
        waiterToastDesc: "Um empregado de mesa irá deslocar-se à Mesa {table} brevemente.",
        searchInput: "Pesquisar prato ou ingrediente...",
        filterAll: "Todos",
        filterSignature: "Destaques",
        filterVegetarian: "Vegetariano",
        filterGluten: "Sem Glúten",
        noResultsTitle: "Nenhum prato encontrado",
        noResultsDesc: "Tente pesquisar por outros ingredientes ou limpe os filtros ativos.",
        btnClearFilters: "Limpar Filtros",
        modalDescriptionTitle: "Descrição",
        modalSubcatTitle: "Subcategoria",
        modalAllergensTitle: "Alérgenos",
        modalAllergensNone: "Sem alérgenos conhecidos",
        btnCloseDetail: "Fechar Ementa",
        specialtyTag: "Especialidade",
        popularTag: "Popular",
        shareTag: "Partilhar",
        freshTag: "Fresco",
        veggieTag: "Veggie",
        healthyTag: "Saudável",
        tableLabel: "Mesa"
    },
    en: {
        welcome: "Welcome to Casta 85. Browse our menu and prepare your choice.",
        callWaiter: "Call Waiter",
        waiterToastTitle: "Waiter Called!",
        waiterToastDesc: "A waiter will come to Table {table} shortly.",
        searchInput: "Search dish or ingredient...",
        filterAll: "All",
        filterSignature: "Signature",
        filterVegetarian: "Vegetarian",
        filterGluten: "Gluten-Free",
        noResultsTitle: "No dishes found",
        noResultsDesc: "Try searching for other ingredients or clear active filters.",
        btnClearFilters: "Clear Filters",
        modalDescriptionTitle: "Description",
        modalSubcatTitle: "Subcategory",
        modalAllergensTitle: "Allergens",
        modalAllergensNone: "No known allergens",
        btnCloseDetail: "Close Menu",
        specialtyTag: "Specialty",
        popularTag: "Popular",
        shareTag: "Share",
        freshTag: "Fresh",
        veggieTag: "Veggie",
        healthyTag: "Healthy",
        tableLabel: "Table"
    }
};

// 2. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    // Carregar Mesa a partir do URL (ex: ?mesa=8)
    const urlParams = new URLSearchParams(window.location.search);
    const mesaParam = urlParams.get('mesa');
    if (mesaParam) {
        currentTable = mesaParam;
    } else {
        currentTable = "5"; // Mesa padrão de simulação se não fornecida
    }
    
    // Mesa e Toasts removidos
    
    // Inicializar idioma padrão (PT)
    updateUILanguage('pt');
    
    // Tentar carregar dados dinâmicos do Google Sheets
    loadMenuData();
    
    // Configurar scrollspy para abas de categoria
    setupScrollSpy();
});

// 3. CARREGAMENTO DOS DADOS (GOOGLE SHEETS OU LOCAL FALLBACK)
async function loadMenuData() {
    if (!GOOGLE_SHEET_CSV_URL) {
        console.log("Sem link de Google Sheets configurado. A usar a ementa local padrão.");
        initializeMenu();
        return;
    }
    
    try {
        console.log("A carregar ementa a partir do Google Sheets...");
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        if (!response.ok) throw new Error("Erro na resposta de rede");
        
        const csvText = await response.text();
        
        // Parsing do CSV usando o PapaParse
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    parseGoogleSheetsData(results.data);
                } else {
                    console.warn("Ficheiro do Sheets vazio. A carregar ementa local.");
                    initializeMenu();
                }
            },
            error: function(err) {
                console.error("Erro ao analisar CSV do Sheets:", err);
                initializeMenu();
            }
        });
    } catch (error) {
        console.error("Não foi possível carregar a ementa remota. A usar ementa local como segurança:", error);
        initializeMenu();
    }
}

function parseGoogleSheetsData(rows) {
    const items = [];
    
    rows.forEach(row => {
        // Obter valores com segurança ignorando acentos ou problemas de chaves no cabeçalho
        const id = row["ID"] || `sheet_item_${items.length + 1}`;
        const category = row["Categoria"] || "Almoco";
        const subcategory = row["Subcategoria"] || "";
        const namePT = row["Nome em Portugues"] || row["Nome PT"] || "";
        const nameEN = row["Nome em Ingles"] || row["Nome EN"] || namePT;
        
        // Tratar preço
        let price = 0.0;
        const rawPrice = row["Preco (Euro)"] || row["Preco"] || "0";
        const cleanPrice = rawPrice.replace(/[^\d,.-]/g, '').replace(',', '.');
        if (cleanPrice) {
            price = parseFloat(cleanPrice) || 0.0;
        }
        
        const descPT = row["Descricao em Portugues"] || row["Descricao PT"] || "";
        const descEN = row["Descricao em Ingles"] || row["Descricao EN"] || descPT;
        
        // Flags simplificadas
        const isDestaque = (row["Destaque (Sim/Nao)"] || row["Destaque"] || "Não").trim().toLowerCase() === 'sim';
        const isVegetariano = (row["Vegetariano (Sim/Nao)"] || row["Vegetariano"] || "Não").trim().toLowerCase() === 'sim';
        const isSemGluten = (row["Sem Gluten (Sim/Nao)"] || row["Sem Gluten"] || "Não").trim().toLowerCase() === 'sim';
        const isDisponivel = (row["Disponivel (Sim/Nao)"] || row["Disponivel"] || "Sim").trim().toLowerCase() !== 'não';
        
        // Se o prato não está marcado como disponível, ignoramos (não aparece na ementa)
        if (!isDisponivel) {
            return;
        }
        
        // Construir tags baseadas em flags booleanas
        const tags = [];
        if (isDestaque) tags.push("Especialidade");
        if (isVegetariano) tags.push("Vegetariano");
        if (isSemGluten) tags.push("Sem Glúten");
        
        items.push({
            id: id,
            category: category,
            subcategory: subcategory,
            name: {
                pt: namePT,
                en: nameEN
            },
            price: price,
            description: {
                pt: descPT,
                en: descEN
            },
            tags: tags,
            image: ''
        });
    });
    
    // Substituir items carregados
    menuData.items = items;
    console.log(`Carregados com sucesso ${items.length} itens do Google Sheets!`);
    initializeMenu();
}

function initializeMenu() {
    renderCategories();
    renderMenu();
}

// 4. RENDERIZAÇÃO DA PÁGINA
function renderCategories() {
    const navContainer = document.getElementById('categories-nav');
    navContainer.innerHTML = '';
    
    menuData.categories.forEach((cat, index) => {
        const activeClass = index === 0 ? 'active' : '';
        const name = cat.name[currentLanguage];
        const btn = document.createElement('button');
        btn.className = `category-tab ${activeClass}`;
        btn.id = `tab-${cat.id}`;
        btn.setAttribute('onclick', `scrollToCategory('${cat.id}')`);
        btn.innerHTML = `<span>${name}</span>`;
        navContainer.appendChild(btn);
    });
}

// Helper para selecionar ícones de prato dinamicamente baseado no nome ou subcategoria
function getDishEmoji(item) {
    const name = (item.name.pt || '').toLowerCase();
    const subcat = (item.subcategory || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    
    if (name.includes('bacalhau') || name.includes('robalo') || name.includes('dourada') || name.includes('raia') || name.includes('chocos') || name.includes('gambas') || name.includes('ameijoas')) {
        return '🐟';
    }
    if (name.includes('frango') || name.includes('codorniz') || name.includes('asas')) {
        return '🍗';
    }
    if (name.includes('picanha') || name.includes('bife') || name.includes('entrecosto') || name.includes('alcatra') || name.includes('bochechas') || name.includes('carne') || name.includes('novilho') || name.includes('cachaço') || name.includes('barriga') || name.includes('rabo')) {
        return '🥩';
    }
    if (name.includes('sopa') || name.includes('caldo') || name.includes('moelas') || name.includes('dobrada')) {
        return '🍲';
    }
    if (name.includes('batata') || name.includes('mandioca') || name.includes('salgados') || name.includes('croquete') || name.includes('chamuça') || name.includes('rissois') || name.includes('coxinhas')) {
        return '🍟';
    }
    if (name.includes('pão') || name.includes('torrada') || name.includes('tosta') || name.includes('croissant') || name.includes('bifana') || name.includes('prego') || name.includes('sandocha')) {
        return '🥖';
    }
    if (name.includes('salada') || name.includes('vinagrete')) {
        return '🥗';
    }
    if (name.includes('queijo') || name.includes('tábua')) {
        return '🧀';
    }
    if (name.includes('café') || name.includes('abatanado') || name.includes('capuccino') || name.includes('galão') || name.includes('chá') || name.includes('leite')) {
        return '☕';
    }
    if (name.includes('sangria') || name.includes('vinho') || name.includes('porto')) {
        return '🍷';
    }
    if (name.includes('imperial') || name.includes('cerveja') || name.includes('corona') || name.includes('sagres') || name.includes('superbock') || name.includes('caneca') || name.includes('sidra')) {
        return '🍺';
    }
    if (name.includes('caipirinha') || name.includes('mojito') || name.includes('gin') || name.includes('margarita') || name.includes('cocktail') || name.includes('drink') || name.includes('rum') || name.includes('blue lagon')) {
        return '🍹';
    }
    if (name.includes('água') || name.includes('sumo') || name.includes('sumol') || name.includes('refrigerante') || name.includes('detox') || name.includes('ucal') || name.includes('shake') || name.includes('cola') || name.includes('up') || name.includes('brisa')) {
        return '🥤';
    }
    if (name.includes('sobremesa') || name.includes('bolo') || name.includes('donuts') || name.includes('doce') || name.includes('crepe') || name.includes('queque') || name.includes('brigadeiro')) {
        return '🍰';
    }
    if (name.includes('corneto') || name.includes('solero') || name.includes('magnum') || name.includes('fizz') || name.includes('gelado') || name.includes('pau')) {
        return '🍦';
    }
    
    // Fallback por Categoria geral
    if (cat.includes('picar')) return '🧀';
    if (cat.includes('pao')) return '🥖';
    if (cat.includes('grelhados')) return '🥩';
    if (cat.includes('bebidas')) return '🥤';
    if (cat.includes('sobremesas')) return '🍰';
    
    return '🍽️';
}

function renderMenu() {
    const container = document.getElementById('menu-sections-container');
    container.innerHTML = '';
    
    // Agrupar itens por categoria
    const itemsByCategory = {};
    menuData.categories.forEach(cat => {
        itemsByCategory[cat.id] = [];
    });
    
    menuData.items.forEach(item => {
        if (itemsByCategory[item.category]) {
            itemsByCategory[item.category].push(item);
        }
    });
    
    // Verificar se temos algum resultado global
    let totalRendered = 0;
    
    menuData.categories.forEach(cat => {
        const catItems = itemsByCategory[cat.id];
        if (catItems && catItems.length > 0) {
            totalRendered += catItems.length;
            
            const section = document.createElement('section');
            section.className = 'menu-section';
            section.id = `section-${cat.id}`;
            
            const categoryName = cat.name[currentLanguage];
            section.innerHTML = `
                <h2 class="section-title">
                    ${categoryName}
                </h2>

                <div class="items-list" id="list-${cat.id}"></div>
            `;
            
            container.appendChild(section);
            const listDiv = document.getElementById(`list-${cat.id}`);
            
            catItems.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card';
                card.setAttribute('onclick', `openDetailModal('${item.id}')`);
                
                // Formatar tags badges - Removido a pedido
                let tagsHtml = '';
                
                const emoji = getDishEmoji(item);
                const name = item.name[currentLanguage];
                const desc = item.description[currentLanguage] || '';
                const priceFormatted = item.price.toFixed(2) + ' €';
                
                card.innerHTML = `
                    <div class="item-info">
                        <div class="item-header-row">
                            <h3 class="item-name">${name}</h3>
                            <span class="item-price">${priceFormatted}</span>
                        </div>
                        <p class="item-description">${desc}</p>
                        <div class="item-footer-row">
                            <div class="item-tags">${tagsHtml}</div>
                        </div>
                    </div>
                `;
                
                listDiv.appendChild(card);
            });
        }
    });
    
    // Mostrar/Ocultar mensagem de sem resultados
    const noResultsDiv = document.getElementById('no-results');
    if (totalRendered === 0) {
        noResultsDiv.style.display = 'block';
    } else {
        noResultsDiv.style.display = 'none';
    }
}

// 5. INTERATIVIDADE DE PESQUISA E FILTROS
function handleSearch() {
    const searchVal = document.getElementById('search-input').value;
    const clearBtn = document.getElementById('clear-search-btn');
    
    if (searchVal.length > 0) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    renderMenu();
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('clear-search-btn').style.display = 'none';
    renderMenu();
}

function toggleFilter(filterType) {
    activeFilter = filterType;
    
    // Atualizar UI dos chips de filtro
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        if (chip.getAttribute('data-filter') === filterType || (filterType === 'all' && chip.getAttribute('data-filter') === 'all')) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
    
    renderMenu();
}

function resetAllFilters() {
    clearSearch();
    toggleFilter('all');
}

// 6. NAVEGAÇÃO DE CATEGORIAS E SCROLL
function scrollToCategory(catId) {
    const element = document.getElementById(`section-${catId}`);
    if (element) {
        window.removeEventListener('scroll', handleScrollSpy);
        
        document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`tab-${catId}`).classList.add('active');
        
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        setTimeout(() => {
            window.addEventListener('scroll', handleScrollSpy);
        }, 800);
    }
}

function setupScrollSpy() {
    window.addEventListener('scroll', handleScrollSpy);
}

function handleScrollSpy() {
    const sections = document.querySelectorAll('.menu-section');
    const tabs = document.querySelectorAll('.category-tab');
    
    let currentActiveId = '';
    
    sections.forEach(section => {
        const top = section.offsetTop - 80;
        const bottom = top + section.offsetHeight;
        const scroll = window.scrollY;
        
        if (scroll >= top && scroll < bottom) {
            currentActiveId = section.id.replace('section-', '');
        }
    });
    
    if (currentActiveId) {
        tabs.forEach(tab => {
            if (tab.id === `tab-${currentActiveId}`) {
                tab.classList.add('active');
                tab.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
            } else {
                tab.classList.remove('active');
            }
        });
    }
}

// 7. DETALHE DO ITEM (MODAL)
function openDetailModal(itemId) {
    const item = menuData.items.find(i => i.id === itemId);
    if (!item) return;
    
    currentModalItem = item;
    
    const emoji = getDishEmoji(item);
    document.getElementById('modal-dish-emoji').textContent = emoji;
    
    const name = item.name[currentLanguage];
    const priceFormatted = item.price.toFixed(2) + ' €';
    const desc = item.description[currentLanguage] || (currentLanguage === 'pt' ? 'Esta especialidade do Casta 85 é confecionada com produtos frescos locais sob a supervisão do Chef João Simões.' : 'This specialty at Casta 85 is prepared with fresh local products under the supervision of Chef João Simões.');
    
    document.getElementById('modal-title-text').textContent = name;
    document.getElementById('modal-price-text').textContent = priceFormatted;
    document.getElementById('modal-description-text').textContent = desc;
    document.getElementById('modal-subcategory-text').textContent = item.subcategory || (currentLanguage === 'pt' ? 'Geral' : 'General');
    
    // Alérgenos detalhados baseados em tipos
    let allergensPT = "Sem alérgenos conhecidos";
    let allergensEN = "No known allergens";
    
    const lowerName = name.toLowerCase();
    if (lowerName.includes('bacalhau') || lowerName.includes('robalo') || lowerName.includes('dourada') || lowerName.includes('raia') || lowerName.includes('chocos') || lowerName.includes('mero') || lowerName.includes('besugo') || lowerName.includes('salmonete') || lowerName.includes('cantaril') || lowerName.includes('lulas')) {
        allergensPT = "Contém Peixe";
        allergensEN = "Contains Fish";
    } else if (lowerName.includes('gambas') || lowerName.includes('ameijoas') || lowerName.includes('carac')) {
        allergensPT = "Contém Moluscos / Crustáceos";
        allergensEN = "Contains Molluscs / Crustaceans";
    } else if (lowerName.includes('queijo') || lowerName.includes('leite') || lowerName.includes('tábua') || lowerName.includes('manteiga') || lowerName.includes('cheddar') || lowerName.includes('creme') || lowerName.includes('sobremesa') || lowerName.includes('lactose')) {
        allergensPT = "Contém Lactose (Leite)";
        allergensEN = "Contains Lactose (Dairy)";
    } else if (lowerName.includes('pão') || lowerName.includes('tosta') || lowerName.includes('torrada') || lowerName.includes('croissant') || lowerName.includes('chamuça') || lowerName.includes('quibe') || lowerName.includes('rissolis') || lowerName.includes('sandocha')) {
        allergensPT = "Contém Glúten (Trigo)";
        allergensEN = "Contains Gluten (Wheat)";
    } else if (lowerName.includes('ovo') || lowerName.includes('bitoque') || lowerName.includes('omelete')) {
        allergensPT = "Contém Ovos";
        allergensEN = "Contains Eggs";
    }
    
    document.getElementById('modal-allergens-text').textContent = currentLanguage === 'pt' ? allergensPT : allergensEN;
    
    // Tags
    const tagsDiv = document.getElementById('modal-tags');
    tagsDiv.innerHTML = '';
    
    if (item.tags && item.tags.length > 0) {
        item.tags.forEach(tag => {
            let translatedTag = tag;
            let tagClass = 'signature';
            const lowerTag = tag.toLowerCase();
            
            if (lowerTag.includes('especialidade') || lowerTag.includes('signature')) {
                translatedTag = translations[currentLanguage].specialtyTag;
                tagClass = 'signature';
            } else if (lowerTag.includes('popular')) {
                translatedTag = translations[currentLanguage].popularTag;
                tagClass = 'signature';
            } else if (lowerTag.includes('vegetariano')) {
                translatedTag = translations[currentLanguage].veggieTag;
                tagClass = 'vegetarian';
            } else if (lowerTag.includes('glúten') || lowerTag.includes('gluten')) {
                translatedTag = translations[currentLanguage].filterGluten;
                tagClass = 'gluten-free';
            }
            
            const badge = document.createElement('span');
            badge.className = `tag-badge ${tagClass}`;
            badge.textContent = translatedTag;
            tagsDiv.appendChild(badge);
        });
    }
    
    // Atualizar botão de fechar modal
    document.getElementById('txt-btn-close-detail').textContent = translations[currentLanguage].btnCloseDetail;
    
    // Abrir Modal
    document.getElementById('detail-modal').classList.add('active');
}

function hideDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
    currentModalItem = null;
}

function closeDetailModal(e) {
    if (e.target.id === 'detail-modal') {
        hideDetailModal();
    }
}

// 8. NOTIFICAÇÕES (CHAMAR EMPREGADO)
function callWaiter() {
    const toast = document.getElementById('waiter-toast');
    
    document.getElementById('txt-waiter-toast-title').textContent = translations[currentLanguage].waiterToastTitle;
    
    const descText = translations[currentLanguage].waiterToastDesc.replace('{table}', currentTable);
    document.getElementById('txt-waiter-toast-desc').textContent = descText;
    document.getElementById('lbl-toast-table').textContent = currentTable;
    
    const btn = document.getElementById('btn-call-waiter');
    btn.style.backgroundColor = '#c5a059';
    btn.style.color = '#000000';
    btn.style.transform = 'scale(1.05)';
    
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
        btn.style.backgroundColor = '';
        btn.style.color = '';
        btn.style.transform = '';
    }, 4000);
}

// 9. CONTROLO DE IDIOMA
function changeLanguage(lang) {
    if (lang === currentLanguage) return;
    currentLanguage = lang;
    
    document.getElementById('lang-pt').classList.toggle('active', lang === 'pt');
    document.getElementById('lang-en').classList.toggle('active', lang === 'en');
    
    updateUILanguage(lang);
    
    renderCategories();
    renderMenu();
}

function updateUILanguage(lang) {
    const dict = translations[lang];
    
    const elWelcome = document.getElementById('txt-welcome');
    if (elWelcome) elWelcome.textContent = dict.welcome;
    
    const elCallWaiter = document.getElementById('txt-call-waiter');
    if (elCallWaiter) elCallWaiter.textContent = dict.callWaiter;
    
    const elSearch = document.getElementById('search-input');
    if (elSearch) elSearch.placeholder = dict.searchInput;
    
    // Removido filtros
    
    document.getElementById('txt-modal-description-title').textContent = dict.modalDescriptionTitle;
    document.getElementById('txt-modal-subcat-title').textContent = dict.modalSubcatTitle;
    document.getElementById('txt-modal-allergens-title').textContent = dict.modalAllergensTitle;
    if (currentModalItem) {
        document.getElementById('txt-btn-close-detail').textContent = dict.btnCloseDetail;
    }
    
    // Lógica removida
}
