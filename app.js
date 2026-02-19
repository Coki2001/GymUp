const firebaseConfig = {
  apiKey: "AIzaSyAHlhE4eU8J30RhB7tPy3GLIHWxUOtFrcY",
  authDomain: "gym-app-32592.firebaseapp.com",
  projectId: "gym-app-32592",
  storageBucket: "gym-app-32592.firebasestorage.app",
  messagingSenderId: "774071130573",
  appId: "1:774071130573:web:2210cb3dba7281067acc84",
  measurementId: "G-80M97K766K"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let countdown;
let sessionStartTime;
let sessionInterval;
let checkCount = 0;
let deleteTargetIndex = null; 


function kreni() {
    document.getElementById('welcome-screen').classList.add('hide-welcome');
    setTimeout(() => {
        document.getElementById('welcome-screen').style.display = 'none';
    }, 800);
}

function showPage(pageId, event) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if(event) event.currentTarget.classList.add('active');
    
    if(pageId === 'workout') {
        prikaziVezbe();
    } else if(pageId === 'profile') {
        ucitajIstoriju();
    } else if(pageId === 'home') {
        azurirajHomeStats();
        ucitajDanasniPlan();
    } else if(pageId === 'nutrition') {
        const user = auth.currentUser;
        const locked = document.getElementById('nutrition-locked');
        const unlocked = document.getElementById('nutrition-unlocked');
        if (user) {
            provjeriPremiumINapravi(() => {
                if (locked) locked.style.display = 'none';
                if (unlocked) unlocked.style.display = 'block';
                ucitajSacuvaniMealPlan();
            }, () => {
                if (locked) locked.style.display = 'block';
                if (unlocked) unlocked.style.display = 'none';
                locked.innerHTML = `<div style="font-size:3.5rem;margin-bottom:20px;">⭐</div>
                    <h3 style="color:#d4af37;margin-bottom:12px;">Premium funkcija</h3>
                    <p style="color:#666;font-size:0.9rem;margin-bottom:30px;">AI plan ishrane dostupan je samo Premium korisnicima.</p>
                    <button onclick="showPage('premium', event)" class="main-btn" style="width:100%;padding:18px;border-radius:15px;">VIDI PREMIUM PLANOVE</button>`;
            });
        } else {
            if (locked) locked.style.display = 'block';
            if (unlocked) unlocked.style.display = 'none';
        }
    } else if(pageId === 'premium') {
        ucitajPremiumStranicu();
    }
}

window.onload = function() {
    prikaziVezbe();
    azurirajHomeStats();
    ucitajDanasniPlan();
};


function startSessionTimer() {
    if(sessionInterval) return;
    sessionStartTime = Date.now();
    sessionInterval = setInterval(() => {
        let diff = Date.now() - sessionStartTime;
        let mins = Math.floor(diff / 60000);
        let secs = Math.floor((diff % 60000) / 1000);
        const timerDisplay = document.getElementById('active-duration');
        if(timerDisplay) {
            timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function dodajTrening() {
    startSessionTimer();
    const kategorija = document.getElementById('exCategory').value;
    const ime = document.getElementById('exName').value;
    const serije = document.getElementById('exSets').value;
    const reps = document.getElementById('exReps').value;
    const weight = document.getElementById('exWeight').value || 0;
    const odmor = document.getElementById('restTime').value || 60;

    if (!ime || !serije || !reps) return alert("Popuni polja!");

    let arhiva = JSON.parse(localStorage.getItem('gymUpData')) || [];
    
    const novaVezba = { 
        kategorija, 
        ime, 
        naziv: ime,
        serije, 
        ponavljanja: reps,
        reps, 
        weight, 
        odmor, 
        datum: new Date().toLocaleDateString('sr-RS'),
        setProgress: Array(parseInt(serije)).fill(false),
        setWeights: Array(parseInt(serije)).fill(parseFloat(weight) || 0)
    };
    
    arhiva.unshift(novaVezba);
    
    localStorage.setItem('gymUpData', JSON.stringify(arhiva));
    
    document.getElementById('exName').value = "";
    document.getElementById('exSets').value = "";
    document.getElementById('exReps').value = "";
    document.getElementById('exWeight').value = "";
    
    prikaziVezbe();
    azurirajHomeStats();
    prikaziObavestenje("Vežba dodata! 💪", "✅");
    
    proveriLicniRekord(ime, weight);
}

function proveriLicniRekord(nazivVezbe, novaKilaza) {
    const istorija = JSON.parse(localStorage.getItem('gymHistory')) || [];
    let maxKilaza = parseFloat(novaKilaza) || 0;
    
    istorija.forEach(sesija => {
        sesija.vezbe.forEach(v => {
            const naziv = v.naziv || v.ime || "";
            if (naziv.toLowerCase() === nazivVezbe.toLowerCase()) {

                if (v.setWeights && Array.isArray(v.setWeights)) {
                    const maxUVezbi = Math.max(...v.setWeights);
                    if (maxUVezbi > maxKilaza) maxKilaza = maxUVezbi;
                }
                if (v.weight && parseFloat(v.weight) > maxKilaza) {
                    maxKilaza = parseFloat(v.weight);
                }
            }
        });
    });
    
    if (parseFloat(novaKilaza) > maxKilaza && parseFloat(novaKilaza) > 0) {
        prikaziObavestenje(`🏆 NOVI LIČNI REKORD! ${nazivVezbe}: ${novaKilaza}kg`, "🎉");
    }
}


function prikaziVezbe() {
    const display = document.getElementById('workout-display');
    if (!display) return;

    const vezbe = JSON.parse(localStorage.getItem('gymUpData')) || [];
    display.innerHTML = "";

    if (vezbe.length === 0) {
        display.innerHTML = "<p style='color:#666; text-align:center; padding: 30px;'>Nema unetih vežbi. Generiši AI plan ili dodaj ručno!</p>";
        return;
    }

    vezbe.forEach((v, exerciseIndex) => {
        const naslov = v.naziv || v.ime || v.exName || "Vežba";
        const brSerija = parseInt(v.serije || v.exSets || 0);
        const brPonavljanja = v.ponavljanja || v.reps || v.exReps || 0;
        const napomena = v.opis || "";
        const odmor = v.odmor || 60;

        if (!v.setProgress) {
            v.setProgress = Array(brSerija).fill(false);
        }
        if (!v.setWeights) {
            const defaultWeight = v.weight || 0;
            v.setWeights = Array(brSerija).fill(defaultWeight);
        }

        const div = document.createElement('div');
        div.className = 'exercise-card';
        div.style.cssText = 'margin-bottom: 20px;';
        
        let html = `
            <div style="background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px; border-left: 5px solid #d4af37; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <div style="margin-bottom: 12px;">
                    <h4 style="margin: 0 0 5px 0; color: #d4af37; font-size: 1.15rem; font-weight: bold;">${naslov}</h4>
                    <p style="margin: 0; color: #999; font-size: 0.85rem;">${brSerija} serije × ${brPonavljanja} ponavljanja ${napomena ? `• ${napomena}` : ''}</p>
                </div>
                
                <!-- Lista serija -->
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
        `;

        for (let i = 0; i < brSerija; i++) {
            const isChecked = v.setProgress[i];
            const currentWeight = v.setWeights[i] || 0;
            const previousWeight = i > 0 ? (v.setWeights[i-1] || 0) : 0;
            
            html += `
                <div class="set-row" style="display: flex; align-items: center; gap: 10px; background: rgba(10,10,10,0.6); padding: 12px 12px; border-radius: 10px; border: 1px solid ${isChecked ? '#d4af37' : '#222'}; transition: all 0.3s;">
                    <button class="set-check-btn ${isChecked ? 'checked' : ''}" 
                            onclick="toggleSet(${exerciseIndex}, ${i})"
                            style="width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; border: 2px solid #d4af37; background: ${isChecked ? '#d4af37' : 'transparent'}; color: ${isChecked ? '#000' : '#d4af37'}; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; transition: all 0.3s; font-weight: bold;">
                        ${isChecked ? '✓' : (i + 1)}
                    </button>
                    
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
                        <span style="color: ${isChecked ? '#d4af37' : '#ccc'}; font-size: 0.9rem; font-weight: ${isChecked ? 'bold' : 'normal'};">
                            ${brPonavljanja} × 
                        </span>
                        ${i > 0 && previousWeight > 0 && currentWeight === 0 ? `
                            <button onclick="copyPreviousWeight(${exerciseIndex}, ${i})" 
                                    style="background: none; border: none; color: #888; font-size: 0.7rem; text-align: left; padding: 0; cursor: pointer; text-decoration: underline;">
                                Kopiraj ${previousWeight}kg
                            </button>
                        ` : ''}
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <input type="number" 
                               id="weight-${exerciseIndex}-${i}"
                               value="${currentWeight}"
                               onchange="updateSetWeight(${exerciseIndex}, ${i}, this.value)"
                               min="0"
                               step="0.5"
                               placeholder="${i > 0 && previousWeight > 0 ? previousWeight : '0'}"
                               style="width: 60px; background: #111; border: 1px solid ${isChecked ? '#d4af37' : '#333'}; color: #fff; padding: 6px 8px; border-radius: 8px; text-align: center; font-size: 0.85rem; font-weight: bold;">
                        <span style="color: #888; font-size: 0.8rem;">kg</span>
                    </div>
                    
                    ${isChecked ? `
                        <button onclick="pokreniOdmor(${odmor}, this)" 
                                style="background: #d4af37; color: #000; border: none; padding: 6px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px rgba(212,175,55,0.3); flex-shrink: 0;">
                            ODMOR
                        </button>
                    ` : ''}
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        div.innerHTML = html;
        display.appendChild(div);
    });

    localStorage.setItem('gymUpData', JSON.stringify(vezbe));
}

function updateSetWeight(exerciseIndex, setIndex, weight) {
    const vezbe = JSON.parse(localStorage.getItem('gymUpData')) || [];
    
    if (!vezbe[exerciseIndex]) return;
    
    if (!vezbe[exerciseIndex].setWeights) {
        const brSerija = parseInt(vezbe[exerciseIndex].serije || vezbe[exerciseIndex].exSets || 0);
        vezbe[exerciseIndex].setWeights = Array(brSerija).fill(0);
    }
    
    const novaKilaza = parseFloat(weight) || 0;
    vezbe[exerciseIndex].setWeights[setIndex] = novaKilaza;
    
    localStorage.setItem('gymUpData', JSON.stringify(vezbe));
    
    if (novaKilaza > 0) {
        const nazivVezbe = vezbe[exerciseIndex].naziv || vezbe[exerciseIndex].ime || "Vežba";
        proveriLicniRekordZaSet(nazivVezbe, novaKilaza);
    }
}

function proveriLicniRekordZaSet(nazivVezbe, novaKilaza) {
    const istorija = JSON.parse(localStorage.getItem('gymHistory')) || [];
    let maxKilaza = 0;
    
    istorija.forEach(sesija => {
        sesija.vezbe.forEach(v => {
            const naziv = v.naziv || v.ime || "";
            if (naziv.toLowerCase() === nazivVezbe.toLowerCase()) {
                if (v.setWeights && Array.isArray(v.setWeights)) {
                    const maxUVezbi = Math.max(...v.setWeights);
                    if (maxUVezbi > maxKilaza) maxKilaza = maxUVezbi;
                }
                if (v.weight && parseFloat(v.weight) > maxKilaza) {
                    maxKilaza = parseFloat(v.weight);
                }
            }
        });
    });
    
    const trenutneVezbe = JSON.parse(localStorage.getItem('gymUpData')) || [];
    trenutneVezbe.forEach(v => {
        const naziv = v.naziv || v.ime || "";
        if (naziv.toLowerCase() === nazivVezbe.toLowerCase() && v.setWeights) {
            const maxUTrenutnom = Math.max(...v.setWeights.filter(w => w > 0));

            if (maxUTrenutnom > maxKilaza && maxUTrenutnom !== novaKilaza) {
                maxKilaza = maxUTrenutnom;
            }
        }
    });
    
    if (novaKilaza > maxKilaza) {
        const prBadge = document.createElement('div');
        prBadge.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #d4af37, #f2d06b);
            color: #000;
            padding: 20px 30px;
            border-radius: 20px;
            font-size: 1.2rem;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 10px 40px rgba(212, 175, 55, 0.5);
            animation: prPulse 0.5s ease;
        `;
        prBadge.innerHTML = `🏆 NOVI PR! ${novaKilaza}kg 🏆`;
        document.body.appendChild(prBadge);
        
        setTimeout(() => {
            prBadge.style.opacity = '0';
            prBadge.style.transition = 'opacity 0.5s';
            setTimeout(() => prBadge.remove(), 500);
        }, 2000);
    }
}

function copyPreviousWeight(exerciseIndex, setIndex) {
    const vezbe = JSON.parse(localStorage.getItem('gymUpData')) || [];
    
    if (!vezbe[exerciseIndex] || setIndex === 0) return;
    
    if (!vezbe[exerciseIndex].setWeights) return;
    
    const previousWeight = vezbe[exerciseIndex].setWeights[setIndex - 1] || 0;
    vezbe[exerciseIndex].setWeights[setIndex] = previousWeight;
    
    localStorage.setItem('gymUpData', JSON.stringify(vezbe));
    
    prikaziVezbe();
    
    prikaziObavestenje(`Kopirano ${previousWeight}kg`, "📋");
}

function toggleSet(exerciseIndex, setIndex) {
    const vezbe = JSON.parse(localStorage.getItem('gymUpData')) || [];
    
    if (!vezbe[exerciseIndex]) return;
    
    if (!vezbe[exerciseIndex].setProgress) {
        const brSerija = parseInt(vezbe[exerciseIndex].serije || vezbe[exerciseIndex].exSets || 0);
        vezbe[exerciseIndex].setProgress = Array(brSerija).fill(false);
    }
    
    vezbe[exerciseIndex].setProgress[setIndex] = !vezbe[exerciseIndex].setProgress[setIndex];
    
    localStorage.setItem('gymUpData', JSON.stringify(vezbe));
    
    prikaziVezbe();
    
    if (vezbe[exerciseIndex].setProgress[setIndex]) {
        prikaziObavestenje(`Serija ${setIndex + 1} završena! 💪`, "✅");
    }
}


async function generisiAITrening() {
    const user = auth.currentUser;
    if (!user) {
        prikaziObavestenje("Moraš biti ulogovan za AI funkcije! 🔒", "⚠️");
        showPage('profile');
        setTimeout(() => {
            const authContainer = document.getElementById('auth-container');
            if (authContainer) {
                authContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                authContainer.style.animation = 'pulse 1s ease-in-out 3';
            }
        }, 300);
        return;
    }

    if (!window.userIsPremium) {
        prikaziObavestenje('AI trening je Premium funkcija ⭐', '🔒');
        setTimeout(() => showPage('premium'), 800);
        return;
    }

    const cilj     = document.getElementById('user-goal').value;
    const lokacija = document.getElementById('user-location').value;
    const visina   = parseFloat(document.getElementById('user-height').value) || 0;
    const tezina   = parseFloat(document.getElementById('user-weight').value) || 0;
    const godine   = parseInt(document.getElementById('user-age').value)      || 0;

    const btn = document.querySelector('[onclick="generisiAITrening()"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite">⚙️</span> AI GENERIŠE...';
    }

    const lokacijaTekst = {
        gym:     '🏋️ Teretana — dostupni su svi spravovi, tegovi, šipke, kablovi',
        home:    '🏠 Kod kuće — samo sopstvena težina, bez opreme',
        outdoor: '🌳 Napolju — calisthenics, parkovi, horizontalne šipke'
    }[lokacija];

    const ciljTekst = {
        mišićna_masa: 'izgradnja mišićne mase — hipertrofija, srednji broj ponavljanja, progresivno opterećenje',
        mrsavljenje:  'sagorijevanje masti — viši broj ponavljanja, kraći odmori, kardio elementi',
        definicija:   'mišićna definicija — superset stil, umjeren intenzitet, visok volumen',
        snaga:        'razvoj maksimalne snage — mali broj ponavljanja, visoka kilaza, dugi odmori'
    }[cilj] || cilj;

    const biometrijaTekst = (visina && tezina && godine)
        ? `Klijent: ${godine} god, ${visina}cm, ${tezina}kg`
        : 'Biometrija nije unesena — generiši za prosječnog rekreativca';

    const prompt = `Ti si iskusni fitnes trener. Kreiraj TRENING ZA DANAS na Bosanskom/Srpskom jeziku.

PROFIL KLIJENTA:
- Lokacija: ${lokacijaTekst}
- Cilj: ${ciljTekst}
- ${biometrijaTekst}

PRAVILA:
1. Generiši 5-7 vježbi prilagođenih lokaciji i cilju
2. Svaka vježba mora imati realističan broj serija (3-5), ponavljanja i odmor u sekundama
3. Za teretanu uključi preporučenu startnu kilažu (kg) na osnovu biometrije — ako nema biometrije, stavi 0
4. Za kućni/outdoor trening kilaza je 0
5. Dodaj kratku napomenu/tehničku uputu za svaku vježbu
6. Vježbe moraju biti raznovrsne (ne samo grudi ili samo noge)

ODGOVORI ISKLJUČIVO U OVOM JSON FORMATU (bez objašnjenja, bez markdown, samo čisti JSON):
{
  "opis": "Kratki opis treninga (1 rečenica)",
  "vezbe": [
    {
      "naziv": "Bench Press",
      "kategorija": "Grudi",
      "serije": 4,
      "ponavljanja": 8,
      "weight": 60,
      "odmor": 90,
      "opis": "Ravna klupa sa šipkom — laktovi pod 45°"
    }
  ]
}`;

    try {
        const GROQ_API_KEY = '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';

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `API greška: ${response.status}`);
        }

        const data = await response.json();
        let rawText = data.choices[0].message.content.trim();
        rawText = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

        const rezultat = JSON.parse(rawText);
        const vezbe = rezultat.vezbe || [];

        if (vezbe.length === 0) throw new Error('AI nije vratio vježbe');

        const formatirane = vezbe.map(v => ({
            naziv:       v.naziv,
            ime:         v.naziv,
            kategorija:  v.kategorija || 'Ostalo',
            serije:      parseInt(v.serije) || 3,
            ponavljanja: v.ponavljanja,
            reps:        v.ponavljanja,
            weight:      parseFloat(v.weight) || 0,
            odmor:       parseInt(v.odmor) || 60,
            opis:        v.opis || '',
            datum:       new Date().toLocaleDateString('sr-RS'),
            setProgress: Array(parseInt(v.serije) || 3).fill(false),
            setWeights:  Array(parseInt(v.serije) || 3).fill(parseFloat(v.weight) || 0)
        }));

        localStorage.setItem('gymUpData', JSON.stringify(formatirane));
        prikaziVezbe();
        azurirajHomeStats();

        const locationEmoji = { gym: '🏋️', home: '🏠', outdoor: '🌳' }[lokacija] || '💪';
        prikaziObavestenje(`${locationEmoji} AI plan generisan! ${rezultat.opis || ''}`, "🚀");
        showPage('workout');

    } catch(error) {
        console.error('AI trening greška:', error);
        let poruka = 'Greška pri generisanju treninga.';
        if (error.message.includes('401'))  poruka = 'Neispravan Groq API ključ!';
        else if (error.message.includes('429')) poruka = 'Previše zahtjeva — pokušaj za koji minut.';
        else if (error.message.includes('JSON')) poruka = 'AI greška formata — pokušaj ponovo.';
        else poruka = `Greška: ${error.message}`;
        prikaziObavestenje(poruka, '❌');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

}


function sacuvajBiometriju() {
    const user = auth.currentUser;
    if (!user) return prikaziObavestenje("Moraš biti ulogovan!", "❌");

    const stats = {
        visina: parseFloat(document.getElementById('user-height').value),
        tezina: parseFloat(document.getElementById('user-weight').value),
        godine: parseInt(document.getElementById('user-age').value),
        cilj: document.getElementById('user-goal').value,
        lokacija: document.getElementById('user-location').value,
        poslednjeAzuriranje: firebase.firestore.FieldValue.serverTimestamp()
    };

    if(!stats.visina || !stats.tezina || !stats.godine) {
        return prikaziObavestenje("Popuni sva polja!", "⚠️");
    }

    db.collection("korisnici").doc(user.uid).set({ biometrija: stats }, { merge: true })
        .then(() => {
            prikaziObavestenje("AI Profil ažuriran!", "🤖");
            ucitajBiometriju(user.uid);
        })
        .catch(err => {
            console.error("Greška:", err);
            prikaziObavestenje("Greška pri čuvanju", "❌");
        });
}

function ucitajBiometriju(uid) {
    db.collection("korisnici").doc(uid).get().then((doc) => {
        if (doc.exists && doc.data().biometrija) {
            const b = doc.data().biometrija;
            document.getElementById('user-height').value = b.visina || '';
            document.getElementById('user-weight').value = b.tezina || '';
            document.getElementById('user-age').value = b.godine || '';
            document.getElementById('user-goal').value = b.cilj || 'mišićna_masa';
            document.getElementById('user-location').value = b.lokacija || 'gym';

            const kalorijeBase = Math.round(10 * b.tezina + 6.25 * b.visina - 5 * b.godine + 5);
            let ciljKalorija = kalorijeBase * 1.5; 

            if (b.cilj === "mišićna_masa") ciljKalorija += 400;
            if (b.cilj === "mrsavljenje") ciljKalorija -= 500;

            const profilDisplay = document.getElementById('user-stats-container');
            if (profilDisplay) {
                let aiBox = document.getElementById('ai-suggestion-box');
                if (!aiBox) {
                    aiBox = document.createElement('div');
                    aiBox.id = 'ai-suggestion-box';
                    profilDisplay.appendChild(aiBox);
                }
                
                let locationIcon = '🏋️';
                let locationText = 'Teretana';
                if (b.lokacija === 'home') {
                    locationIcon = '🏠';
                    locationText = 'Kod kuće';
                } else if (b.lokacija === 'outdoor') {
                    locationIcon = '🌳';
                    locationText = 'Napolju';
                }
                
                aiBox.innerHTML = `
                    <div style="background: rgba(212,175,55,0.1); border: 1px solid #d4af37; padding: 15px; border-radius: 10px; margin-top: 15px; text-align: center;">
                        <p style="margin: 0; font-size: 0.8rem; color: #d4af37; letter-spacing: 1px; font-weight:bold;">🤖 AI DNEVNI SAVET</p>
                        <h2 style="margin: 10px 0; color: white; font-size: 1.8rem;">${ciljKalorija} kcal</h2>
                        <p style="margin: 0; color: #ccc; font-size: 0.9rem;">Voda: ${Math.round(b.tezina * 0.033 * 10) / 10}L / dan</p>
                        <p style="margin: 5px 0 0 0; color: #888; font-size: 0.8rem;">${locationIcon} ${locationText}</p>
                    </div>
                `;
            }
        }
    }).catch(err => console.error("Greška učitavanja:", err));
}


auth.onAuthStateChanged((user) => {
    const loggedOutUI = document.getElementById('auth-logged-out');
    const loggedInUI = document.getElementById('auth-logged-in');
    const userEmailDisplay = document.getElementById('user-display-email');
    const planSection = document.getElementById('plan-section');
    const nutritionLocked = document.getElementById('nutrition-locked');
    const nutritionUnlocked = document.getElementById('nutrition-unlocked');

    if (user) {
        if (loggedOutUI) loggedOutUI.style.display = 'none';
        if (loggedInUI) loggedInUI.style.display = 'block';
        if (planSection) planSection.style.display = 'block';
        if (userEmailDisplay) userEmailDisplay.innerText = user.email;
        ucitajBiometriju(user.uid);
        ucitajPremiumStatus(user.uid);

        const lockIcon = document.getElementById('ai-trening-lock');
        if (lockIcon) lockIcon.style.display = (user.email === OWNER_EMAIL) ? 'none' : 'inline';
    } else {
        if (loggedOutUI) loggedOutUI.style.display = 'block';
        if (loggedInUI) loggedInUI.style.display = 'none';
        if (planSection) planSection.style.display = 'none';
        if (nutritionLocked) nutritionLocked.style.display = 'block';
        if (nutritionUnlocked) nutritionUnlocked.style.display = 'none';
        window.userIsPremium = false;
        const lockIcon = document.getElementById('ai-trening-lock');
        if (lockIcon) lockIcon.style.display = 'none';
    }
});

function registrujSe() {
    const email = document.getElementById('auth-email').value;
    const lozinka = document.getElementById('auth-password').value;
    if(!email || !lozinka) return alert("Unesi email i lozinku!");
    
    auth.createUserWithEmailAndPassword(email, lozinka)
        .then(() => prikaziObavestenje("Uspešna registracija!", "🎉"))
        .catch(e => {
            console.error(e);
            prikaziObavestenje(e.message, "❌");
        });
}

function prijaviSe() {
    const email = document.getElementById('auth-email').value;
    const lozinka = document.getElementById('auth-password').value;
    
    if(!email || !lozinka) return alert("Unesi email i lozinku!");
    
    auth.signInWithEmailAndPassword(email, lozinka)
        .then(() => prikaziObavestenje("Dobrodošli nazad!", "💪"))
        .catch(e => {
            console.error(e);
            prikaziObavestenje("Pogrešan email ili lozinka", "❌");
        });
}

function odjaviSe() {
    auth.signOut().then(() => {
        prikaziObavestenje("Odjava uspešna", "👋");

        setTimeout(() => location.reload(), 1000);
    });
}


function sacuvajPlan() {
    const dan = document.getElementById('planDay').value;
    const fokus = document.getElementById('planFocus').value;
    
    if(!fokus) return prikaziObavestenje("Unesi fokus treninga!", "⚠️");
    
    let plan = JSON.parse(localStorage.getItem('weeklyPlan')) || {};
    plan[dan] = fokus;
    localStorage.setItem('weeklyPlan', JSON.stringify(plan));
    
    prikaziObavestenje("Plan sačuvan! 📅", "✅");
    document.getElementById('planFocus').value = "";
    ucitajDanasniPlan();
}

function ucitajDanasniPlan() {
    const plan = JSON.parse(localStorage.getItem('weeklyPlan')) || {};
    const danasnji = new Date().getDay(); 
    
    const display = document.getElementById('today-plan-display');
    const fokusEl = document.getElementById('today-focus');
    
    if(plan[danasnji]) {
        if(display) display.style.display = 'block';
        if(fokusEl) fokusEl.innerText = plan[danasnji];
        
        const btnContainer = document.getElementById('generate-today-btn');
        if(btnContainer) {
            btnContainer.innerHTML = `
                <button onclick="generisiIzPlana('${plan[danasnji]}')" 
                        style="background: linear-gradient(45deg, #d4af37, #f4cf47); 
                               color: #000; 
                               border: none; 
                               padding: 10px 20px; 
                               border-radius: 25px; 
                               font-weight: bold; 
                               cursor: pointer; 
                               margin-top: 10px; 
                               width: 100%;
                               font-size: 0.85rem;
                               box-shadow: 0 4px 15px rgba(212,175,55,0.3);">
                    🤖 GENERIŠI PLAN ZA DANAS
                </button>
            `;
        }
    } else {
        if(display) display.style.display = 'none';
    }
}

function generisiIzPlana(opisTreninga) {

    const user = auth.currentUser;
    if (!user) {
        prikaziObavestenje("Moraš biti ulogovan za AI funkcije! 🔒", "⚠️");
        showPage('profile');
        setTimeout(() => {
            const authContainer = document.getElementById('auth-container');
            if (authContainer) {
                authContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                authContainer.style.animation = 'pulse 1s ease-in-out 3';
            }
        }, 300);
        return;
    }
    
    const opis = opisTreninga.toLowerCase();
    
    let lokacija = document.getElementById('user-location')?.value || 'gym';
    let cilj = document.getElementById('user-goal')?.value || 'mišićna_masa';
    
    const savedPrefs = JSON.parse(localStorage.getItem('userPreferences')) || {};
    if (!lokacija || lokacija === '') lokacija = savedPrefs.lokacija || 'gym';
    if (!cilj || cilj === '') cilj = savedPrefs.cilj || 'mišićna_masa';
    
    let preporuceneVezbe = [];
    
    const imaGrudi = opis.includes('grudi') || opis.includes('chest');
    const imaBiceps = opis.includes('biceps') || opis.includes('ruke');
    const imaTriceps = opis.includes('triceps') || opis.includes('ruke');
    const imaLedja = opis.includes('leđa') || opis.includes('leda') || opis.includes('back');
    const imaRamena = opis.includes('ramena') || opis.includes('rame') || opis.includes('shoulders');
    const imaNoge = opis.includes('noge') || opis.includes('legs') || opis.includes('kvadriceps') || opis.includes('but');
    const imaCore = opis.includes('trbuh') || opis.includes('core') || opis.includes('abs');
    
    if (lokacija === 'gym') {

        if (imaGrudi) {
            preporuceneVezbe.push(
                { naziv: "Bench Press", kategorija: "Grudi", serije: 4, ponavljanja: 8, opis: "Ravna klupa", odmor: 90, weight: 60 },
                { naziv: "Incline Dumbbell Press", kategorija: "Grudi", serije: 4, ponavljanja: 10, opis: "Kosa klupa", odmor: 75, weight: 22 },
                { naziv: "Cable Flyes", kategorija: "Grudi", serije: 3, ponavljanja: 12, opis: "Izolacija", odmor: 60, weight: 12 },
                { naziv: "Dips (Chest)", kategorija: "Grudi", serije: 3, ponavljanja: 10, opis: "Nagnut napred", odmor: 60, weight: 0 }
            );
        }
        
        if (imaBiceps) {
            preporuceneVezbe.push(
                { naziv: "Barbell Curl", kategorija: "Ruke", serije: 4, ponavljanja: 10, opis: "Šipka stojke", odmor: 60, weight: 25 },
                { naziv: "Hammer Curls", kategorija: "Ruke", serije: 3, ponavljanja: 12, opis: "Neutralni hvat", odmor: 60, weight: 12 },
                { naziv: "Preacher Curl", kategorija: "Ruke", serije: 3, ponavljanja: 10, opis: "Klupa izolacija", odmor: 60, weight: 15 },
                { naziv: "Cable Curl", kategorija: "Ruke", serije: 3, ponavljanja: 15, opis: "Konstantna tenzija", odmor: 45, weight: 20 }
            );
        }
        
        if (imaTriceps) {
            preporuceneVezbe.push(
                { naziv: "Close Grip Bench", kategorija: "Ruke", serije: 4, ponavljanja: 8, opis: "Uski hvat", odmor: 75, weight: 50 },
                { naziv: "Tricep Pushdown", kategorija: "Ruke", serije: 4, ponavljanja: 12, opis: "Kabel pritisak", odmor: 60, weight: 25 },
                { naziv: "Overhead Extension", kategorija: "Ruke", serije: 3, ponavljanja: 10, opis: "Iznad glave", odmor: 60, weight: 20 },
                { naziv: "Dips (Triceps)", kategorija: "Ruke", serije: 3, ponavljanja: 12, opis: "Uspravno", odmor: 60, weight: 0 }
            );
        }
        
        if (imaLedja) {
            preporuceneVezbe.push(
                { naziv: "Deadlift", kategorija: "Leđa", serije: 4, ponavljanja: 6, opis: "Kompound pokret", odmor: 120, weight: 100 },
                { naziv: "Pull-ups", kategorija: "Leđa", serije: 4, ponavljanja: 10, opis: "Široki hvat", odmor: 90, weight: 0 },
                { naziv: "Barbell Row", kategorija: "Leđa", serije: 4, ponavljanja: 10, opis: "Savijeni red", odmor: 75, weight: 60 },
                { naziv: "Lat Pulldown", kategorija: "Leđa", serije: 3, ponavljanja: 12, opis: "Mašina", odmor: 60, weight: 50 }
            );
        }
        
        if (imaRamena) {
            preporuceneVezbe.push(
                { naziv: "Military Press", kategorija: "Ramena", serije: 4, ponavljanja: 8, opis: "Šipka stojke", odmor: 90, weight: 40 },
                { naziv: "Lateral Raises", kategorija: "Ramena", serije: 4, ponavljanja: 12, opis: "Bučice sa strane", odmor: 60, weight: 10 },
                { naziv: "Front Raises", kategorija: "Ramena", serije: 3, ponavljanja: 12, opis: "Bučice napred", odmor: 60, weight: 10 },
                { naziv: "Face Pulls", kategorija: "Ramena", serije: 3, ponavljanja: 15, opis: "Zadnji delt", odmor: 45, weight: 15 }
            );
        }
        
        if (imaNoge) {
            preporuceneVezbe.push(
                { naziv: "Squat", kategorija: "Noge", serije: 4, ponavljanja: 10, opis: "Duboki čučanj", odmor: 120, weight: 80 },
                { naziv: "Leg Press", kategorija: "Noge", serije: 4, ponavljanja: 12, opis: "Mašina", odmor: 90, weight: 120 },
                { naziv: "Romanian Deadlift", kategorija: "Noge", serije: 3, ponavljanja: 10, opis: "Hamstrings", odmor: 90, weight: 60 },
                { naziv: "Leg Curl", kategorija: "Noge", serije: 3, ponavljanja: 15, opis: "Zadnja loža", odmor: 60, weight: 40 }
            );
        }
        
        if (imaCore) {
            preporuceneVezbe.push(
                { naziv: "Cable Crunches", kategorija: "Core", serije: 4, ponavljanja: 15, opis: "Kabel", odmor: 45, weight: 30 },
                { naziv: "Hanging Leg Raises", kategorija: "Core", serije: 3, ponavljanja: 12, opis: "Viseći", odmor: 60, weight: 0 },
                { naziv: "Ab Wheel", kategorija: "Core", serije: 3, ponavljanja: 10, opis: "Točak", odmor: 60, weight: 0 },
                { naziv: "Plank", kategorija: "Core", serije: 3, ponavljanja: "60s", opis: "Statika", odmor: 45, weight: 0 }
            );
        }
    }

    else {

        if (imaGrudi) {
            preporuceneVezbe.push(
                { naziv: "Push-ups (Regular)", kategorija: "Grudi", serije: 4, ponavljanja: 15, opis: "Standardni sklekovi", odmor: 60, weight: 0 },
                { naziv: "Wide Push-ups", kategorija: "Grudi", serije: 4, ponavljanja: 12, opis: "Široke ruke", odmor: 60, weight: 0 },
                { naziv: "Diamond Push-ups", kategorija: "Grudi", serije: 3, ponavljanja: 10, opis: "Uske ruke", odmor: 60, weight: 0 },
                { naziv: "Decline Push-ups", kategorija: "Grudi", serije: 3, ponavljanja: 12, opis: "Noge na visini", odmor: 60, weight: 0 }
            );
        }
        
        if (imaBiceps) {
            preporuceneVezbe.push(
                { naziv: "Chin-ups", kategorija: "Ruke", serije: 4, ponavljanja: 8, opis: "Supinirani hvat", odmor: 90, weight: 0 },
                { naziv: "Bodyweight Curls", kategorija: "Ruke", serije: 3, ponavljanja: 12, opis: "Ispod šipke", odmor: 60, weight: 0 },
                { naziv: "Towel Curls", kategorija: "Ruke", serije: 3, ponavljanja: 15, opis: "Sa peškirom", odmor: 60, weight: 0 },
                { naziv: "Isometric Hold", kategorija: "Ruke", serije: 3, ponavljanja: "30s", opis: "Statički 90°", odmor: 45, weight: 0 }
            );
        }
        
        if (imaTriceps) {
            preporuceneVezbe.push(
                { naziv: "Bench Dips", kategorija: "Ruke", serije: 4, ponavljanja: 15, opis: "Stolica/klupa", odmor: 60, weight: 0 },
                { naziv: "Diamond Push-ups", kategorija: "Ruke", serije: 4, ponavljanja: 10, opis: "Fokus triceps", odmor: 60, weight: 0 },
                { naziv: "Pike Push-ups", kategorija: "Ruke", serije: 3, ponavljanja: 12, opis: "Laktovi nazad", odmor: 60, weight: 0 },
                { naziv: "Tricep Extension (Floor)", kategorija: "Ruke", serije: 3, ponavljanja: 15, opis: "Sa poda", odmor: 45, weight: 0 }
            );
        }
        
        if (imaLedja) {
            preporuceneVezbe.push(
                { naziv: "Pull-ups", kategorija: "Leđa", serije: 4, ponavljanja: 8, opis: "Široki hvat", odmor: 90, weight: 0 },
                { naziv: "Australian Pull-ups", kategorija: "Leđa", serije: 4, ponavljanja: 12, opis: "Niska šipka", odmor: 60, weight: 0 },
                { naziv: "Superman Hold", kategorija: "Leđa", serije: 3, ponavljanja: "45s", opis: "Donji deo leđa", odmor: 60, weight: 0 },
                { naziv: "Reverse Snow Angels", kategorija: "Leđa", serije: 3, ponavljanja: 15, opis: "Leži na stomaku", odmor: 45, weight: 0 }
            );
        }
        
        if (imaRamena) {
            preporuceneVezbe.push(
                { naziv: "Pike Push-ups", kategorija: "Ramena", serije: 4, ponavljanja: 12, opis: "Kukovi visoko", odmor: 75, weight: 0 },
                { naziv: "Handstand Push-ups", kategorija: "Ramena", serije: 3, ponavljanja: 6, opis: "Uz zid", odmor: 120, weight: 0 },
                { naziv: "Lateral Plank Walk", kategorija: "Ramena", serije: 3, ponavljanja: 10, opis: "Bočni planku", odmor: 60, weight: 0 },
                { naziv: "Arm Circles", kategorija: "Ramena", serije: 3, ponavljanja: 30, opis: "Mali krugovi", odmor: 30, weight: 0 }
            );
        }
        
        if (imaNoge) {
            preporuceneVezbe.push(
                { naziv: "Pistol Squats", kategorija: "Noge", serije: 4, ponavljanja: 8, opis: "Po nozi", odmor: 90, weight: 0 },
                { naziv: "Bulgarian Split Squat", kategorija: "Noge", serije: 4, ponavljanja: 12, opis: "Zadnja noga na visini", odmor: 75, weight: 0 },
                { naziv: "Nordic Curls", kategorija: "Noge", serije: 3, ponavljanja: 6, opis: "Hamstrings killer", odmor: 90, weight: 0 },
                { naziv: "Calf Raises", kategorija: "Noge", serije: 3, ponavljanja: 20, opis: "Listovi", odmor: 45, weight: 0 }
            );
        }
        
        if (imaCore) {
            preporuceneVezbe.push(
                { naziv: "L-Sit Hold", kategorija: "Core", serije: 4, ponavljanja: "30s", opis: "Isometrija", odmor: 60, weight: 0 },
                { naziv: "Bicycle Crunches", kategorija: "Core", serije: 4, ponavljanja: 25, opis: "Ukoso", odmor: 45, weight: 0 },
                { naziv: "Plank Variations", kategorija: "Core", serije: 3, ponavljanja: "60s", opis: "Front/Side", odmor: 45, weight: 0 },
                { naziv: "Mountain Climbers", kategorija: "Core", serije: 3, ponavljanja: 30, opis: "Dinamično", odmor: 45, weight: 0 }
            );
        }
    }
    
    if (preporuceneVezbe.length === 0) {
        prikaziObavestenje("Nisam prepoznao mišićne grupe. Koristim AI generator.", "⚠️");
        return generisiAITrening();
    }
    
    preporuceneVezbe = preporuceneVezbe.map(v => ({
        ...v,
        ime: v.naziv,
        reps: v.ponavljanja,
        datum: new Date().toLocaleDateString('sr-RS'),
        setProgress: Array(v.serije).fill(false),
        setWeights: Array(v.serije).fill(v.weight || 0)
    }));
    
    localStorage.setItem('gymUpData', JSON.stringify(preporuceneVezbe));
    prikaziVezbe();
    azurirajHomeStats();
    
    const locationEmoji = lokacija === 'gym' ? '🏋️' : (lokacija === 'home' ? '🏠' : '🌳');
    prikaziObavestenje(`${locationEmoji} Trening generisan: ${opisTreninga}! 🤖`, "✅");
    showPage('workout');
}


function arhivirajTrening() {
    const vezbe = JSON.parse(localStorage.getItem('gymUpData')) || [];
    
    if(vezbe.length === 0) {
        return prikaziObavestenje("Nema vežbi za arhiviranje!", "⚠️");
    }
    
    let trajanje = "0:00";
    if(sessionStartTime) {
        const diff = Date.now() - sessionStartTime;
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        trajanje = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    let ukupnoSerija = 0;
    let zavrsenoSerija = 0;
    
    vezbe.forEach(v => {
        const brSerija = parseInt(v.serije || v.exSets || 0);
        ukupnoSerija += brSerija;
        
        if (v.setProgress && Array.isArray(v.setProgress)) {
            zavrsenoSerija += v.setProgress.filter(Boolean).length;
        }
    });
    
    let istorija = JSON.parse(localStorage.getItem('gymHistory')) || [];
    
    const sesija = {
        datum: new Date().toISOString(),
        datumTekst: new Date().toLocaleDateString('sr-RS'),
        vezbe: vezbe,
        brojVezbi: vezbe.length,
        trajanje: trajanje,
        ukupnoSerija: ukupnoSerija,
        zavrsenoSerija: zavrsenoSerija,
        procenatZavrsenosti: ukupnoSerija > 0 ? Math.round((zavrsenoSerija / ukupnoSerija) * 100) : 0
    };
    
    istorija.unshift(sesija); 
    
    localStorage.setItem('gymHistory', JSON.stringify(istorija));
    
    localStorage.removeItem('gymUpData');
    
    if(sessionInterval) {
        clearInterval(sessionInterval);
        sessionInterval = null;
    }
    checkCount = 0;
    sessionStartTime = null;
    
    prikaziObavestenje(`Trening sačuvan! ${zavrsenoSerija}/${ukupnoSerija} serija završeno 🎉`, "💪");
    
    prikaziVezbe();
    azurirajHomeStats();
    
    setTimeout(() => {
        showPage('home');
        const timerDisplay = document.getElementById('active-duration');
        if(timerDisplay) timerDisplay.innerText = "00:00";
    }, 1500);
}


function ucitajIstoriju() {
    const display = document.getElementById('history-display');
    if(!display) return;
    
    const istorija = JSON.parse(localStorage.getItem('gymHistory')) || [];
    
    if(istorija.length === 0) {
        display.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #666;">
                <p style="font-size: 2rem; margin-bottom: 10px;">📭</p>
                <p>Nemaš još sačuvanih treninga</p>
                <small style="color: #444;">Završi trening da bi se pojavio ovde</small>
            </div>
        `;
        return;
    }
    
    display.innerHTML = "";
    
    istorija.forEach((sesija, index) => {
        const procenat = sesija.procenatZavrsenosti || 0;
        const color = procenat === 100 ? '#4ade80' : procenat >= 70 ? '#d4af37' : '#ff8c00';
        
        const div = document.createElement('div');
        div.className = 'history-card';
        div.style.cssText = `
            background: #111;
            border: 1px solid #222;
            border-radius: 15px;
            padding: 15px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.3s;
        `;
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                    <h4 style="color: #d4af37; margin: 0 0 5px 0;">Trening ${istorija.length - index}</h4>
                    <p style="color: #888; font-size: 0.85rem; margin: 0;">${sesija.datumTekst}</p>
                </div>
                <div style="text-align: right;">
                    <p style="color: #fff; margin: 0; font-size: 1.1rem; font-weight: bold;">${sesija.brojVezbi} vežbi</p>
                    <p style="color: #666; font-size: 0.8rem; margin: 0;">⏱️ ${sesija.trajanje}</p>
                </div>
            </div>
            
            <!-- Progress indicator -->
            ${sesija.ukupnoSerija ? `
                <div style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="color: #888; font-size: 0.75rem;">ZAVRŠENOST</span>
                        <span style="color: ${color}; font-size: 0.85rem; font-weight: bold;">${procenat}%</span>
                    </div>
                    <div style="height: 6px; background: #222; border-radius: 10px; overflow: hidden;">
                        <div style="height: 100%; width: ${procenat}%; background: ${color}; transition: width 0.5s ease; box-shadow: 0 0 10px ${color}50;"></div>
                    </div>
                    <p style="color: #666; font-size: 0.75rem; margin: 5px 0 0 0;">${sesija.zavrsenoSerija || 0}/${sesija.ukupnoSerija || 0} serija</p>
                </div>
            ` : ''}
            
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button onclick="prikaziDetalje(${index})" style="flex: 1; background: #222; border: 1px solid #d4af37; color: #d4af37; padding: 8px; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">
                    👁️ DETALJI
                </button>
                <button onclick="obrisiTrening(${index})" style="background: #ff4444; border: none; color: white; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">
                    🗑️
                </button>
            </div>
        `;
        
        display.appendChild(div);
    });
}

function prikaziDetalje(index) {
    const istorija = JSON.parse(localStorage.getItem('gymHistory')) || [];
    const sesija = istorija[index];
    
    if(!sesija) return;
    
    const modal = document.getElementById('details-modal');
    const dateEl = document.getElementById('details-date');
    const nameEl = document.getElementById('details-workout-name');
    const listEl = document.getElementById('details-list');
    
    const procenat = sesija.procenatZavrsenosti || 0;
    if(dateEl) dateEl.innerText = `📋 ${sesija.datumTekst}`;
    if(nameEl) nameEl.innerText = `${sesija.brojVezbi} vežbi • ${sesija.trajanje} • ${procenat}% završeno`;
    
    if(listEl) {
        listEl.innerHTML = "";
        sesija.vezbe.forEach((v, i) => {
            const naslov = v.naziv || v.ime || "Vežba";
            const serije = parseInt(v.serije || 0);
            const reps = v.ponavljanja || v.reps || 0;
            const kategorija = v.kategorija || "";
            
            const item = document.createElement('div');
            item.className = 'detail-item';
            
            let setDisplay = '';
            if (v.setProgress && Array.isArray(v.setProgress)) {
                setDisplay = `<div style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">`;
                
                for (let s = 0; s < serije; s++) {
                    const isCompleted = v.setProgress[s];
                    const weight = v.setWeights && v.setWeights[s] ? v.setWeights[s] : (v.weight || 0);
                    
                    setDisplay += `
                        <div style="
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 3px;
                        ">
                            <span style="
                                width: 28px; 
                                height: 28px; 
                                border-radius: 50%; 
                                background: ${isCompleted ? '#d4af37' : '#222'}; 
                                color: ${isCompleted ? '#000' : '#666'}; 
                                display: flex; 
                                align-items: center; 
                                justify-content: center; 
                                font-size: 0.75rem; 
                                font-weight: bold;
                                border: 1px solid ${isCompleted ? '#d4af37' : '#333'};
                            ">
                                ${isCompleted ? '✓' : (s + 1)}
                            </span>
                            ${isCompleted && weight > 0 ? `
                                <span style="
                                    font-size: 0.7rem;
                                    color: #d4af37;
                                    font-weight: bold;
                                    white-space: nowrap;
                                ">
                                    ${weight}kg
                                </span>
                            ` : ''}
                        </div>
                    `;
                }
                
                setDisplay += `</div>`;
            }
            
            item.innerHTML = `
                <p class="detail-item-title">
                    ${i + 1}. ${naslov}
                    ${kategorija ? `<span class="detail-badge">${kategorija}</span>` : ''}
                </p>
                <p class="detail-item-info">
                    <strong>${serije}</strong> serija × <strong>${reps}</strong> ponavljanja
                </p>
                ${setDisplay}
            `;
            listEl.appendChild(item);
        });
    }
    
    if(modal) modal.style.display = 'flex';
}

function zatvoriDetalje() {
    const modal = document.getElementById('details-modal');
    if(modal) modal.style.display = 'none';
}

function obrisiTrening(index) {
    deleteTargetIndex = index;
    const modal = document.getElementById('delete-modal');
    if(modal) modal.style.display = 'flex';
    

    const confirmBtn = document.getElementById('confirm-delete-btn');
    if(confirmBtn) {
        confirmBtn.onclick = () => potvrdiDelete();
    }
}

function potvrdiDelete() {
    if(deleteTargetIndex === null) return;
    
    let istorija = JSON.parse(localStorage.getItem('gymHistory')) || [];
    istorija.splice(deleteTargetIndex, 1);
    localStorage.setItem('gymHistory', JSON.stringify(istorija));
    
    deleteTargetIndex = null;
    zatvoriDeleteModal();
    ucitajIstoriju();
    azurirajHomeStats();
    prikaziObavestenje("Trening obrisan", "🗑️");
}

function zatvoriDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if(modal) modal.style.display = 'none';
    deleteTargetIndex = null;
}


function azurirajHomeStats() {
    const vezbe = JSON.parse(localStorage.getItem('gymUpData')) || [];
    const countEl = document.getElementById('count-workouts');
    if(countEl) {
        countEl.innerText = vezbe.length;
    }
    
    let ukupnoSerija = 0;
    let zavrsenoSerija = 0;
    
    vezbe.forEach(v => {
        const brSerija = parseInt(v.serije || v.exSets || 0);
        ukupnoSerija += brSerija;
        
        if (v.setProgress && Array.isArray(v.setProgress)) {
            zavrsenoSerija += v.setProgress.filter(Boolean).length;
        }
    });
    
    const progressInfo = document.getElementById('total-progress-info');
    if (progressInfo && ukupnoSerija > 0) {
        const procenat = Math.round((zavrsenoSerija / ukupnoSerija) * 100);
        progressInfo.innerHTML = `
            <div style="margin: 15px 0; padding: 15px; background: rgba(212,175,55,0.1); border-radius: 12px; border: 1px solid #d4af37;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #d4af37; font-size: 0.85rem; font-weight: bold;">UKUPAN PROGRESS</span>
                    <span style="color: #fff; font-weight: bold;">${zavrsenoSerija}/${ukupnoSerija} serija</span>
                </div>
                <div style="height: 8px; background: #222; border-radius: 10px; overflow: hidden;">
                    <div style="height: 100%; width: ${procenat}%; background: linear-gradient(90deg, #d4af37, #f2d06b); transition: width 0.5s ease; box-shadow: 0 0 10px rgba(212,175,55,0.5);"></div>
                </div>
            </div>
        `;
    } else if (progressInfo) {
        progressInfo.innerHTML = '';
    }
    
    azurirajDanasnjeTreninge();
    
    azurirajGrafikon();
}

function azurirajDanasnjeTreninge() {
    const istorija = JSON.parse(localStorage.getItem('gymHistory')) || [];
    const danas = new Date().toLocaleDateString('sr-RS');
    
    const danasnji = istorija.filter(sesija => sesija.datumTekst === danas);
    
    const countEl = document.getElementById('count-workouts');
    const durationEl = document.getElementById('active-duration-home');
    const summaryCard = document.getElementById('today-summary-card');
    const volumeEl = document.getElementById('total-volume-today');
    const setsEl = document.getElementById('total-sets-today');
    
    if (danasnji.length > 0) {

        let ukupnoVezbi = 0;
        let ukupnoVreme = 0; 
        let ukupanVolumen = 0; 
        let ukupnoSerija = 0;
        
        danasnji.forEach(sesija => {
            ukupnoVezbi += sesija.brojVezbi || 0;
            

            if (sesija.trajanje) {
                const parts = sesija.trajanje.split(':');
                if (parts.length === 2) {
                    const mins = parseInt(parts[0]) || 0;
                    const secs = parseInt(parts[1]) || 0;
                    ukupnoVreme += (mins * 60) + secs;
                }
            }
            
            if (sesija.vezbe && Array.isArray(sesija.vezbe)) {
                sesija.vezbe.forEach(vezba => {
                    const reps = parseInt(vezba.ponavljanja || vezba.reps || 0);
                    const serije = parseInt(vezba.serije || 0);
                    
                    if (vezba.setWeights && Array.isArray(vezba.setWeights)) {
                        vezba.setWeights.forEach((weight, idx) => {
                            if (vezba.setProgress && vezba.setProgress[idx]) {
                                ukupanVolumen += (parseFloat(weight) || 0) * reps;
                                ukupnoSerija++;
                            }
                        });
                    } else if (vezba.weight) {

                        const weight = parseFloat(vezba.weight) || 0;
                        ukupanVolumen += weight * reps * serije;
                        ukupnoSerija += serije;
                    }
                });
            }
        });
        
        if (countEl) countEl.innerText = ukupnoVezbi;
        if (durationEl) {
            const mins = Math.floor(ukupnoVreme / 60);
            durationEl.innerText = mins;
        }
        
        if (summaryCard && (ukupanVolumen > 0 || ukupnoSerija > 0)) {
            summaryCard.style.display = 'block';
            if (volumeEl) volumeEl.innerText = Math.round(ukupanVolumen).toLocaleString('sr-RS');
            if (setsEl) setsEl.innerText = ukupnoSerija;
        } else if (summaryCard) {
            summaryCard.style.display = 'none';
        }
    } else {

        if (countEl) countEl.innerText = '0';
        if (durationEl) durationEl.innerText = '0';
        if (summaryCard) summaryCard.style.display = 'none';
    }
    
    const trenutneVezbe = JSON.parse(localStorage.getItem('gymUpData')) || [];
    if (trenutneVezbe.length > 0) {

        const ukupnoZavrsenih = danasnji.reduce((sum, s) => sum + (s.brojVezbi || 0), 0);
        if (countEl) {
            countEl.innerText = ukupnoZavrsenih + trenutneVezbe.length;
        }
    }
}

function azurirajGrafikon() {
    const istorija = JSON.parse(localStorage.getItem('gymHistory')) || [];
    
    for(let i = 0; i <= 6; i++) {
        const bar = document.getElementById(`day-${i}`);
        if(bar) bar.style.height = '5%';
    }
    
    const aktivnost = {};
    istorija.forEach(sesija => {
        try {
            const datum = new Date(sesija.datum);
            const dan = datum.getDay(); // 
            aktivnost[dan] = (aktivnost[dan] || 0) + sesija.brojVezbi;
        } catch(e) {
            console.error("Greška parsiranja datuma:", e);
        }
    });
    
    const maxVezbe = Math.max(...Object.values(aktivnost), 1);
    
    Object.keys(aktivnost).forEach(dan => {
        const bar = document.getElementById(`day-${dan}`);
        if(bar) {
            const procenat = Math.max(5, (aktivnost[dan] / maxVezbe) * 100);
            bar.style.height = `${procenat}%`;
        }
    });
}


function pokreniOdmor(sekunde, dugme) {
    if(!dugme.classList.contains('done')) {
        checkCount++;
    }
    dugme.classList.add('done');
    
    const overlay = document.getElementById('timer-display');
    const timerText = document.getElementById('timer-seconds');
    
    if(!overlay || !timerText) return;
    
    overlay.style.display = 'flex';
    let preostalo = sekunde;
    timerText.innerText = preostalo;
    
    clearInterval(countdown);
    
    countdown = setInterval(() => {
        preostalo--;
        timerText.innerText = preostalo;
        
        if(preostalo <= 0) {
            zaustaviOdbrojavanje();
            document.getElementById('finish-popup').style.display = 'flex';
            
            const zvuk = document.getElementById('finish-sound');
            if(zvuk) {
                zvuk.play().catch(e => console.log("Audio play error:", e));
            }
        }
    }, 1000);
}

function zaustaviOdbrojavanje() {
    clearInterval(countdown);
    const overlay = document.getElementById('timer-display');
    if(overlay) overlay.style.display = 'none';
}

function zatvoriPopup() {
    const popup = document.getElementById('finish-popup');
    if(popup) popup.style.display = 'none';
}


function resetujPlan() {
    if(confirm("Da li sigurno želiš da obrišeš trenutni plan vežbi?")) {
        localStorage.removeItem('gymUpData');
        prikaziVezbe();
        azurirajHomeStats();
        prikaziObavestenje("Plan je obrisan", "🗑️");
        

        if(sessionInterval) {
            clearInterval(sessionInterval);
            sessionInterval = null;
        }
        checkCount = 0;
        sessionStartTime = null;
        
        const timerDisplay = document.getElementById('active-duration');
        if(timerDisplay) timerDisplay.innerText = "00:00";
    }
}


function prikaziObavestenje(poruka, ikona = '✨') {
    const toast = document.createElement('div');
    toast.className = 'toast-notif';
    toast.innerHTML = `<span class="toast-icon">${ikona}</span> <span>${poruka}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}


const DANI_NEDJELJE = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];

function ucitajSacuvaniMealPlan() {
    const sacuvanPlan = localStorage.getItem('mealPlan');
    
    if (sacuvanPlan) {
        try {
            const planData = JSON.parse(sacuvanPlan);
            prikaziMealPlan(planData);
        } catch(e) {
            console.log('Nema sačuvanog plana');
        }
    }
}

async function generisiMealPlan() {
    const GROQ_API_KEY = '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';
    const apiKey = GROQ_API_KEY;

    const cilj = document.getElementById('meal-goal').value;
    const kalorije = parseInt(document.getElementById('meal-calories').value);
    const brojObroka = parseInt(document.getElementById('meal-count').value);
    const alergije = document.getElementById('meal-allergies').value.trim();

    if (!kalorije || kalorije < 1000 || kalorije > 6000) {
        prikaziObavestenje('Unesi kalorije između 1000 i 6000!', '⚠️');
        return;
    }

    document.getElementById('nutrition-form-section').style.display = 'none';
    document.getElementById('nutrition-result').style.display = 'none';
    document.getElementById('nutrition-loading').style.display = 'block';

    const ciljTekst = {
        'mišićna_masa': 'izgradnja mišićne mase (bulk) — visok unos proteina i ugljenih hidrata',
        'mrsavljenje': 'mršavljenje i sagorijevanje masti (cut) — kalorijski deficit, visok protein, niska masnoća',
        'odrzavanje': 'održavanje tjelesne mase i dobre forme'
    }[cilj];

    const alergijeTekst = alergije ? `Obavezno izbjegavati: ${alergije}.` : 'Bez posebnih alergija.';

    const prompt = `Ti si nutricionista i fitnes ekspert. Kreiraj DETALJAN SEDMIČNI PLAN ISHRANE (7 dana) na Bosanskom/Srpskom jeziku.

PARAMETRI KLIJENTA:
- Cilj: ${ciljTekst}
- Dnevni unos kalorija: ${kalorije} kcal
- Broj obroka dnevno: ${brojObroka}
- ${alergijeTekst}

PRAVILA:
1. Svaki dan mora imati TAČNO ${brojObroka} obroka
2. Ukupne kalorije po danu moraju biti ≈${kalorije} kcal (±100 kcal tolerancija)
3. Obroci moraju biti praktični, lokalne namirnice, laki za pripremu
4. Za svaki obrok navedi: naziv, namirnice s gramažom, kalorije, proteine, ugljene hidrate, masti, preporučeno vrijeme
5. Raznovrsnost između dana — ne ponavljaj iste obroke svaki dan

ODGOVORI ISKLJUČIVO U OVOM JSON FORMATU (bez objašnjenja, bez markdown, samo čisti JSON):
{
  "cilj": "${cilj}",
  "dnevneKalorije": ${kalorije},
  "brojObroka": ${brojObroka},
  "dani": [
    {
      "dan": "Ponedjeljak",
      "ukupnoKalorija": 2500,
      "ukupnoProtein": 180,
      "ukupnoUH": 280,
      "ukupnoMasti": 75,
      "obroci": [
        {
          "naziv": "Doručak",
          "vrijemePreporuka": "07:00",
          "hrana": "Ovsena kaša sa bananom i proteinskim praškom — 100g zob, 1 banana (120g), 30g proteinskog praška",
          "kalorije": 520,
          "protein": 42,
          "ugljeniHidrati": 68,
          "masti": 9
        }
      ]
    }
  ]
}`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 6000
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `API greška: ${response.status}`);
        }

        const data = await response.json();
        let rawText = data.choices[0].message.content.trim();

        rawText = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

        const planData = JSON.parse(rawText);

        localStorage.setItem('mealPlan', JSON.stringify(planData));

        document.getElementById('nutrition-loading').style.display = 'none';
        prikaziMealPlan(planData);
        prikaziObavestenje('AI plan ishrane generisan! 🥗', '✅');

    } catch(error) {
        document.getElementById('nutrition-loading').style.display = 'none';
        document.getElementById('nutrition-form-section').style.display = 'block';
        
        let poruka = 'Greška pri generisanju plana.';
        if (error.message.includes('401')) poruka = 'Neispravan Groq API ključ. Provjeri ga na console.groq.com!';
        else if (error.message.includes('429')) poruka = 'Previše zahtjeva. Pokušaj za koji minut.';
        else if (error.message.includes('quota') || error.message.includes('limit')) poruka = 'Dostignut dnevni limit Groq API-ja. Pokušaj sutra.';
        else if (error.message.includes('JSON')) poruka = 'AI je vratio neispravan format. Pokušaj ponovo.';
        else poruka = `Greška: ${error.message}`;
        
        prikaziObavestenje(poruka, '❌');
        console.error('Meal plan greška:', error);
    }
}

function prikaziMealPlan(planData) {
    document.getElementById('nutrition-form-section').style.display = 'none';
    document.getElementById('nutrition-loading').style.display = 'none';
    document.getElementById('nutrition-result').style.display = 'block';

    const ciljIkone = {
        'mišićna_masa': '💪',
        'mrsavljenje': '🔥',
        'odrzavanje': '⚖️'
    };

    const ciljNazivi = {
        'mišićna_masa': 'Mišićna masa',
        'mrsavljenje': 'Mršavljenje',
        'odrzavanje': 'Održavanje'
    };

    let ukupnoProtein = 0, ukupnoUH = 0, ukupnoMasti = 0;
    if (planData.dani && planData.dani.length > 0) {
        planData.dani.forEach(d => {
            ukupnoProtein += d.ukupnoProtein || 0;
            ukupnoUH += d.ukupnoUH || 0;
            ukupnoMasti += d.ukupnoMasti || 0;
        });
        ukupnoProtein = Math.round(ukupnoProtein / planData.dani.length);
        ukupnoUH = Math.round(ukupnoUH / planData.dani.length);
        ukupnoMasti = Math.round(ukupnoMasti / planData.dani.length);
    }

    const summaryEl = document.getElementById('nutrition-summary');
    summaryEl.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05)); border: 1px solid #d4af37; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <div style="text-align: center; margin-bottom: 15px;">
                <span style="font-size: 2rem;">${ciljIkone[planData.cilj] || '🍽️'}</span>
                <h3 style="color: #d4af37; margin: 5px 0; letter-spacing: 2px; font-size: 0.9rem; text-transform: uppercase;">${ciljNazivi[planData.cilj] || planData.cilj}</h3>
                <p style="color: #fff; font-size: 2rem; font-weight: bold; margin: 5px 0;">${planData.dnevneKalorije} <span style="font-size: 1rem; color: #888;">kcal/dan</span></p>
            </div>
            <div class="nutrition-stats">
                <div class="nutrition-stat-card">
                    <h4>${ukupnoProtein}g</h4>
                    <p>Protein</p>
                </div>
                <div class="nutrition-stat-card">
                    <h4>${ukupnoUH}g</h4>
                    <p>Ugljeni hidrati</p>
                </div>
                <div class="nutrition-stat-card">
                    <h4>${ukupnoMasti}g</h4>
                    <p>Masti</p>
                </div>
            </div>
        </div>
    `;

    const daniEl = document.getElementById('nutrition-days');
    daniEl.innerHTML = '';

    const danEmojiMap = ['📅','📅','📅','📅','📅','🌟','☀️'];

    (planData.dani || []).forEach((dan, idx) => {
        const dayCard = document.createElement('div');
        dayCard.className = 'meal-day-card';
        dayCard.id = `day-card-${idx}`;

        let obrociHTML = '';
        (dan.obroci || []).forEach((obrok, oIdx) => {
            obrociHTML += `
                <div class="meal-item">
                    <div class="meal-item-header">
                        <div class="meal-item-name">${obrok.naziv}</div>
                        <div class="meal-item-time">${obrok.vrijemePreporuka || ''}</div>
                    </div>
                    <div class="meal-item-foods">${obrok.hrana}</div>
                    <div class="meal-macros">
                        <div class="macro-badge">🔥 <span>${obrok.kalorije}</span> kcal</div>
                        <div class="macro-badge">🥩 <span>${obrok.protein}g</span> protein</div>
                        <div class="macro-badge">🌾 <span>${obrok.ugljeniHidrati}g</span> UH</div>
                        <div class="macro-badge">🫙 <span>${obrok.masti}g</span> masti</div>
                    </div>
                </div>
            `;
        });

        dayCard.innerHTML = `
            <div class="meal-day-header" onclick="toggleDayCard(${idx})">
                <h3>${danEmojiMap[idx] || '📅'} ${dan.dan}</h3>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="day-kcal">${dan.ukupnoKalorija || 0} kcal</span>
                    <span class="meal-day-chevron">▼</span>
                </div>
            </div>
            <div class="meal-day-body">
                <div style="display: flex; gap: 10px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #1a1a1a;">
                    <span style="font-size: 0.75rem; color: #888;">🥩 ${dan.ukupnoProtein || 0}g protein</span>
                    <span style="font-size: 0.75rem; color: #888;">🌾 ${dan.ukupnoUH || 0}g UH</span>
                    <span style="font-size: 0.75rem; color: #888;">🫙 ${dan.ukupnoMasti || 0}g masti</span>
                </div>
                ${obrociHTML}
            </div>
        `;

        daniEl.appendChild(dayCard);

        if (idx === 0) {
            dayCard.classList.add('open');
        }
    });
}

function toggleDayCard(idx) {
    const card = document.getElementById(`day-card-${idx}`);
    if (!card) return;
    card.classList.toggle('open');
}

function resetujMealPlan() {
    localStorage.removeItem('mealPlan');
    document.getElementById('nutrition-result').style.display = 'none';
    document.getElementById('nutrition-form-section').style.display = 'block';
    document.getElementById('nutrition-days').innerHTML = '';
    document.getElementById('nutrition-summary').innerHTML = '';
    prikaziObavestenje('Unesite nove podatke za novi plan', '🔄');
}


const OWNER_EMAIL = 'slavkovica40@gmail.com';

let odabraniPlan = 'monthly';
window.userIsPremium = false;

function jeVlasnik() {
    const user = auth.currentUser;
    return user && user.email === OWNER_EMAIL;
}

function initPaddle() {
    if (typeof Paddle === 'undefined') {
        setTimeout(initPaddle, 500);
        return;
    }
    Paddle.Environment.set("production"); 
    Paddle.Initialize({
        token: "live_a256329d857f5e51471f3cd26e3", 
        eventCallback: function(event) {
            if (event.name === "checkout.completed") {
                onPlacanjeUspjesno(event.data);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initPaddle);

function ucitajPremiumStatus(uid) {

    if (jeVlasnik()) {
        window.userIsPremium = true;
        const badge = document.querySelector('.badge');
        if (badge) {
            badge.textContent = '👑 OWNER';
            badge.style.background = 'linear-gradient(135deg, #d4af37, #f2d06b)';
            badge.style.color = '#000';
        }
        return;
    }

    db.collection("korisnici").doc(uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const isPremium = data.premium === true;
            const premiumDo = data.premiumDo ? new Date(data.premiumDo) : null;
            const aktivan = isPremium && premiumDo && premiumDo > new Date();
            window.userIsPremium = aktivan;


            const lockIcon = document.getElementById('ai-trening-lock');
            if (lockIcon) lockIcon.style.display = aktivan ? 'none' : 'inline';


            const badge = document.querySelector('.badge');
            if (badge) {
                badge.textContent = aktivan ? '💎 PREMIUM' : 'FREE';
                badge.style.background = aktivan
                    ? 'linear-gradient(135deg, #d4af37, #f2d06b)'
                    : '#333';
                badge.style.color = aktivan ? '#000' : '#888';
            }

            const premiumPage = document.getElementById('premium');
            if (premiumPage && premiumPage.classList.contains('active')) {
                ucitajPremiumStranicu();
            }
        }
    });
}


function provjeriPremiumINapravi(akoPremium, akoNije) {
    if (window.userIsPremium) {
        akoPremium();
    } else {
        akoNije();
    }
}


function ucitajPremiumStranicu() {
    const user = auth.currentUser;
    const elActive   = document.getElementById('premium-active');
    const elInactive = document.getElementById('premium-inactive');
    const elLocked   = document.getElementById('premium-locked');

    if (!elActive || !elInactive || !elLocked) return;

    if (!user) {
        elActive.style.display   = 'none';
        elInactive.style.display = 'none';
        elLocked.style.display   = 'block';
        return;
    }

    elLocked.style.display = 'none';

    if (jeVlasnik()) {
        elActive.style.display   = 'block';
        elInactive.style.display = 'none';
        const el = document.getElementById('premium-do-tekst');
        if (el) el.textContent = '👑 Vlasnik aplikacije — neograničen pristup';
        return;
    }

    if (window.userIsPremium) {
        elActive.style.display   = 'block';
        elInactive.style.display = 'none';

        db.collection("korisnici").doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const doDate = data.premiumDo ? new Date(data.premiumDo) : null;
                const plan = data.premiumPlan === 'yearly' ? 'Godišnji' : 'Mjesečni';
                const otkazano = data.premiumOtkazano ? ' (ističe)' : '';
                const doTekst = doDate
                    ? `${plan} plan • Aktivan do ${doDate.toLocaleDateString('sr-Latn')}${otkazano}`
                    : `${plan} plan • Aktivan`;
                const el = document.getElementById('premium-do-tekst');
                if (el) el.textContent = doTekst;
            }
        });
    } else {
        elActive.style.display   = 'none';
        elInactive.style.display = 'block';
        odaberiPlan(odabraniPlan);
    }
}


function odaberiPlan(plan) {
    odabraniPlan = plan;

    const monthly = document.getElementById('plan-monthly');
    const yearly  = document.getElementById('plan-yearly');
    const btn     = document.getElementById('checkout-btn');

    if (!monthly || !yearly) return;

    if (plan === 'monthly') {
        monthly.classList.add('selected-plan');
        yearly.classList.remove('selected-plan');
        if (btn) btn.textContent = 'PRETPLATI SE — €5/mj';
    } else {
        yearly.classList.add('selected-plan');
        monthly.classList.remove('selected-plan');
        if (btn) btn.textContent = 'PRETPLATI SE — €50/god';
    }
}


function kreniNaplatu() {
    const user = auth.currentUser;
    if (!user) {
        prikaziObavestenje('Moraš biti ulogovan!', '❌');
        return;
    }

    if (typeof Paddle === 'undefined') {
        prikaziObavestenje('Paddle se učitava, pokušaj ponovo.', '⚠️');
        return;
    }

    const PRICE_IDS = {
        monthly: 'pri_01khnd7vkct9zh9fxxptx35v10', 
        yearly:  'pri_01khnday1nw5hg06bf3nsa5txh'   
    };

    const priceId = PRICE_IDS[odabraniPlan];

    Paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        customer: { email: user.email },
        customData: {
            firebaseUID: user.uid,
            plan: odabraniPlan
        },
        settings: {
            displayMode: "overlay",
            theme: "dark",
            locale: "en"
        }
    });
}

async function onPlacanjeUspjesno(data) {
    const user = auth.currentUser;
    if (!user) return;

    const plan = odabraniPlan;

    const sada = new Date();
    const premiumDo = plan === 'yearly'
        ? new Date(sada.setFullYear(sada.getFullYear() + 1))
        : new Date(sada.setMonth(sada.getMonth() + 1));

    await db.collection("korisnici").doc(user.uid).set({
        premium: true,
        premiumPlan: plan,
        premiumDo: premiumDo.toISOString(),
        paddleSubscriptionId: data?.subscription?.id || '',
        paddleCustomerId: data?.customer?.id || ''
    }, { merge: true });

    window.userIsPremium = true;
    prikaziObavestenje('💎 Premium aktiviran! Dobrodošao!', '🎉');

    setTimeout(() => {
        ucitajPremiumStranicu();
        showPage('home');
    }, 2000);
}

async function otkaziPretplatu() {
    if (!confirm('Sigurno želiš otkazati pretplatu? Ostaje aktivna do kraja perioda.')) return;

    const user = auth.currentUser;
    if (!user) return;

    const doc = await db.collection("korisnici").doc(user.uid).get();
    const customerId = doc.exists ? doc.data().paddleCustomerId : null;

    if (customerId) {

        window.open(`https://customer.paddle.com/subscriptions`, '_blank');
    } else {
        prikaziObavestenje('Kontaktiraj nas za otkazivanje.', 'ℹ️');
    }

    await db.collection("korisnici").doc(user.uid).set({
        premiumOtkazano: true
    }, { merge: true });

    prikaziObavestenje('Pretplata će isteći na kraju perioda.', '✅');
    setTimeout(() => ucitajPremiumStranicu(), 1000);
}
