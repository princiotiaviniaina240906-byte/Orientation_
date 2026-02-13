document.addEventListener('DOMContentLoaded', function() {
    // ---------- ÉLÉMENTS DOM ----------
    const menuPrincipal = document.getElementById('menu-principal');
    const moduleContent = document.getElementById('module-content');
    const btnSubmit = document.getElementById('btn-submit-all');

    // ---------- CHARGEMENT DES ÉCOLES DEPUIS JSON ----------
    let ecolesFilieres = [];
    fetch('ecoles.json')
        .then(response => response.json())
        .then(data => {
            ecolesFilieres = data;
            console.log('✅ Écoles chargées :', ecolesFilieres.length);
        })
        .catch(err => console.error('❌ Erreur chargement ecoles.json', err));

    // ---------- GESTION DU MENU ----------
    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const module = this.dataset.module;
            menuPrincipal.style.display = 'none';
            moduleContent.style.display = 'block';
            genererFormulaire(module);
        });
    });

    // ---------- GÉNÉRATEURS DE FORMULAIRES ----------
    function genererFormulaire(module) {
        let html = '';
        switch(module) {
            case 'releve':
                html = genererReleve();
                break;
            case 'interets':
                html = genererInterets();
                break;
            case 'personnalite':
                html = genererPersonnalite();
                break;
            case 'projet':
                html = genererProjet();
                break;
            case 'langues':
                html = genererLangues();
                break;
            case 'budget':
                html = genererBudget();
                break;
        }
        moduleContent.innerHTML = html;
        if (module === 'releve') initReleveForm();
        else initOptionButtons();
        initEnregistrement(module);
        initBoutonRetour();
    }

    // --- BOUTON RETOUR ---
    function initBoutonRetour() {
        const btnBack = document.querySelector('.btn-back');
        if (btnBack) {
            btnBack.addEventListener('click', function() {
                moduleContent.style.display = 'none';
                menuPrincipal.style.display = 'flex';
            });
        }
    }

    // --- TOUS LES GÉNÉRATEURS DE FORMULAIRES (inchangés) ---
    // (Insérez ici les fonctions genererReleve, genererInterets, etc.
    // Elles sont identiques à celles de la version précédente.
    // Pour gagner de la place, je les résume, mais vous devez les copier depuis le script précédent.)

    // NOTE : Pour la version complète, reportez-vous au code JS de la réponse antérieure.
    // Je fournis ici uniquement les adaptations nécessaires pour le mode statique.

    // --- EXEMPLE : genererReleve (simplifié) ---
    function genererReleve() { /* ... */ }

    // --- INIT RELEVÉ ---
    function initReleveForm() { /* ... */ }

    // --- OPTIONS BOUTONS ---
    function initOptionButtons() { /* ... */ }

    // --- SAUVEGARDE LOCALSTORAGE ---
    function initEnregistrement(moduleName) { /* ... */ }
    function saveHandler(e) { /* ... */ }

    // ---------- FONCTION DE MATCHING (COPIÉE DEPUIS Flask) ----------
    function calculerMatching(profil) {
        let scores = [];
        ecolesFilieres.forEach(filiere => {
            let score = 0;
            let bac_user = profil.type_bac || 'Général';
            let serie_user = profil.serie || '';

            // Éligibilité
            if (filiere.bac_requis.includes('toutes')) {
                score += 20;
            } else if (bac_user === 'Technique' && filiere.bac_requis.some(b => ['Technique','Technique agricole','Technique industriel'].includes(b))) {
                score += 20;
            } else if (filiere.bac_requis.includes(serie_user)) {
                score += 20;
            } else {
                return; // non éligible
            }

            // Notes pondérées
            let notes = profil.notes_generales || {};
            let total_points = 0, total_coeff = 0;
            for (let m in notes) {
                total_points += (notes[m].note || 0) * (notes[m].coeff || 1);
                total_coeff += (notes[m].coeff || 1);
            }
            if (total_coeff > 0) score += total_points / total_coeff;

            // Centres d'intérêt
            let centres = profil.domaines_favoris || [];
            if (typeof centres === 'string') centres = [centres];
            let mots_cles = filiere.filiere.toLowerCase();
            centres.forEach(c => {
                if (mots_cles.includes(c.toLowerCase()) || c.toLowerCase().includes(mots_cles)) score += 10;
            });

            // Projet professionnel
            if (profil.statut_vise === 'Entrepreneur' && filiere.filiere.includes('Gestion')) score += 10;
            if (profil.statut_vise === 'Fonctionnaire' && (filiere.filiere.includes('Droit') || filiere.filiere.includes('Communication'))) score += 10;

            // Langues
            if (profil.anglais === 'Avancé' && filiere.filiere.includes('International')) score += 5;

            scores.push({
                ecole: filiere.ecole,
                filiere: filiere.filiere,
                score: Math.round(score * 10) / 10
            });
        });

        scores.sort((a, b) => b.score - a.score);
        return {
            top3: scores.slice(0, 3),
            top2Ecoles: extraireTop2Ecoles(scores),
            coursRemise: genererCoursRemise(profil)
        };
    }

    function extraireTop2Ecoles(scores) {
        let vues = new Set(), result = [];
        for (let item of scores) {
            if (!vues.has(item.ecole)) {
                result.push({ ecole: item.ecole, filiere: item.filiere });
                vues.add(item.ecole);
            }
            if (result.length === 2) break;
        }
        return result;
    }

    function genererCoursRemise(profil) {
        let cours = [];
        let notes = profil.notes_generales || {};
        for (let m in notes) {
            if (notes[m].note < 10) cours.push(`Renforcement en ${m}`);
        }
        return cours.length ? cours : ['Aucun cours de remise à niveau nécessaire'];
    }

    // ---------- SOUMISSION FINALE ----------
    btnSubmit.addEventListener('click', function() {
        let profil = JSON.parse(localStorage.getItem('profil_orientation')) || {};
        if (Object.keys(profil).length === 0) {
            alert('Veuillez remplir au moins un module.');
            return;
        }

        // Vérifier que les écoles sont chargées
        if (ecolesFilieres.length === 0) {
            alert('Les données des écoles ne sont pas encore chargées. Veuillez réessayer.');
            return;
        }

        let resultats = calculerMatching(profil);

        // Afficher les résultats
        menuPrincipal.style.display = 'none';
        moduleContent.style.display = 'block';
        moduleContent.innerHTML = afficherResultats(resultats);
    });

    function afficherResultats(data) {
        return `
        <div class="resultats-card">
            <h2>🎓 Votre orientation personnalisée</h2>
            <h3>🏆 Top 3 des filières adaptées</h3>
            ${data.top3.map((f, i) => `
                <div class="top-item">
                    <strong>${i+1}. ${f.filiere}</strong><br>
                    <span style="color: var(--gray);">${f.ecole}</span>
                    <div style="margin-top:0.5rem;">Score: ${f.score}</div>
                </div>
            `).join('')}
            <h3>🏛️ Top 2 écoles accessibles</h3>
            <ul>
                ${data.top2Ecoles.map(e => `<li><strong>${e.ecole}</strong> – ${e.filiere}</li>`).join('')}
            </ul>
            <h3>📚 Cours de remise à niveau</h3>
            <ul>${data.coursRemise.map(c => `<li>${c}</li>`).join('')}</ul>
            <button class="btn" onclick="location.reload()">⟲ Recommencer</button>
        </div>
        `;
    }

    // Initialisation
    initOptionButtons();
});