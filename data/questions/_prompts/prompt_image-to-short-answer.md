<Exemple pentru "domain":
["Sport"] - Ex: întrebări despre fotbal, tenis
["Istorie"] - Ex: evenimente istorice, personalități marcante
["Religie"]
["Artă"] - Ex: pictură, sculptură
["Muzică"] - Ex: , muzică
["Biologie"] - Ex: organisme, corpul uman
["Geografie"] - Ex: explorări geografice
["Divertisment"] - Ex: filme, seriale, gaming
["Știință"] - descoperiri științifice,
["Tehnologie"] - Ex: inovații tehnologice, inteligență artificială
["Literatură"] - Ex: opere literare, autori celebri, curente literare
["Matematică"] - Ex: probleme de geometrie, algebră, statistică
["Economie", "Finanțe"] - Ex: piețe financiare, concepte economice
["Medicină"] - Ex: boli, tratamente, anatomie
["Gastronomie"] - Ex: rețete tradiționale, bucătării internaționale
["Arhitectură"] - Ex: stiluri arhitecturale, clădiri celebre
["Cultură"] - Ex: obiceiuri populare, sărbători tradiționale
["Filozofie"] - Ex: curente filozofice, gânditori importanți
["Astronomie"] - Ex: planete, constelații, fenomene cosmice
["Psihologie"] - Ex: comportament uman, dezvoltare personală
["Drept"] - Ex: legislație, concepte juridice
["Limbi-străine"] - Ex: gramatică, vocabular, expresii>

--------------------------------------------------<Prompt Simplu>-------------------------------------
Trebuie să configurezi o bază de date JSON pentru un set de întrebări de tip IMG_SA (Image to Short Answer) care vor fi folosite într-un quiz interactiv. În acest format, utilizatorului i se va arăta o imagine, iar acesta va trebui să ofere un răspuns scurt specific (de exemplu: să identifice ce reprezintă imaginea). Raspunsul corect se află în numele fisierului.

Ce trebuie să faci:
Vei primi o listă de fișiere de imagini din folderul "assets/database/images/<numele-categoriei>/"
Setezi <numele-categoriei> = "fructe"
Setezi "domain": ["Biologie"]
Pentru fiecare imagine, trebuie să creezi o intrare în baza de date JSON folosind formatul specificat

Foarte important: vei completa doar "domain": ["<numele domeniului>"], "media": "<locația imaginii>" si "answer": {
"text": "<răspunsul corect>"
}.

Toate celelalte atribute raman goale

**Structură JSON exemplificată:**

{
"question": {
"media": "<calea către imagine>",
"hints": [""]
},
"answer": {
"text": "<răspunsul corect>"
},
"tags": {
"domain": ["<Domeniul>"],
"period": [""],
"region": [""],
"difficulty": "",
"general": [""]
}
}

Exemple concrete:
// Exemple pentru întrebări despre steaguri
{
"question": {
"media": "/assets/database/images/steaguri-țări/Bosnia_and_Herzegovina.png",
"hints": [""]  
 },
"answer": {
"text": "Bosnia și Herțegovina"
},
"tags": {
"domain": ["Geografie"],
"period": [""],
"region": [""],
"difficulty": "",
"general": [""]
}
},
{
"question": {
"media": "/assets/database/images/steaguri-țări/Andorra.png",
"hints": [""]
},
"answer": {
"text": "Andorra"
},
"tags": {
"domain": ["Geografie"],
"period": [""],
"region": [""],
"difficulty": "",
"general": [""]
}
}

// Exemple pentru întrebări despre animale
{
"question": {
"media": "/assets/database/images/animale/albină.jpg",
"hints": [""]
},
"answer": {
"text": "Albină"
},
"tags": {
"domain": ["Biologie"],
"period": [""],
"region": [""],
"difficulty": "",
"general": [""]
}
}
<Lista de fisiere>:

--------------------------------------------------<Prompt Specific>-------------------------------------
Trebuie să configurezi o bază de date JSON pentru un set de întrebări de tip IMG_SA (Image to Short Answer) care vor fi folosite într-un quiz interactiv. În acest format, utilizatorului i se va arăta o imagine, iar acesta va trebui să ofere un răspuns scurt specific (de exemplu: să identifice ce reprezintă imaginea). Raspunsul se află în numele fisierului.

Ce trebuie să faci:
Vei primi o listă de fișiere de imagini din folderul "assets/database/images/<numele-categoriei>/"

Pentru fiecare imagine, trebuie să creezi o intrare în baza de date JSON folosind formatul specificat

**Structură JSON exemplificată:**

{
"question": {
"media": "<calea către imagine>",
"hints": ["<Hint1>","<Hint2>" ]
},
"answer": {
"text": "<răspunsul corect>"
},
"tags": {
"domain": ["<Domeniul>"],
"period": ["<Perioada>"],
"region": ["<Regiunea>"],
"difficulty": "<nivelul de dificultate>",
"general": ["<tag1>","<tag2>"]
}
}

**1. Domenii tematice "domain":**
Îți voi spune eu la ce domeniu se incadrează.

**2. Perioadă "period":** Obligatoriu - trebuie sa fie una din perioade. Cel mai important este sa fie specificat secolul, dar putem avea si decade: ex la Roger Federer "decade": [2000-2010, 2010-2020] sau in alte situatii 2 secole.. (totusi s-ar putea sa avem si intrebari care nu implica o perioada – de ex steaguri, sau plante).
pentru î.Hr. folosim (ex: "Secolul V î. Hr. ")
pentru d Hr. Folosim doar (ex: "Secolul V")
Contemporan: neapărat pentru post-1950 specificăm și decada (ex: "Secolul XX" cu "1970-1980" sau "Secolul XXI" cu "2020-2030"). Daca se intinde pe 2 decade folosim array si punem ambele ["1970-1980", "1980-1990"]
am putea avea si mileniu la intrebarile despre care nu stim secolul exact: "Mileniul V î. Hr."

Exemple pentru "period":

- ["Secolul V î.Hr."] – Ex: Grecia antică.
- ["Mileniul III î.Hr."] – Ex: primele civilizații.
- ["Secolul XIX", "Secolul XX"] – Ex: tranziția dintre epoci.
- ["Secolul XX", "1960-1970"] – Ex: decade specifice.
- ["Secolul XXI", "2020-2030"] – Ex: epoca contemporană.
- [""] – Ex: întrebări fără perioadă (plante, steaguri).

**3. Regiune "region":**
Exemple pentru "region":

- ["Europa"] – Ex: întrebări generale despre continent.
- ["România", "Maramureș"] – Ex: o regiune specifică.
- ["Asia", "Japonia"] – Ex: întrebări despre Japonia.
- ["Statele Unite", "California"] – Ex: întrebări despre California.
- ["Africa"] – Ex: explorări africane.
- ["Global"] – Ex: albine.
- [""] – Ex: întrebări fără legătură cu o regiune (științe).

**4. Dificultate:**
Exemple pentru "difficulty". Se va avea ca referinta faptul ca resondenții locuiesc in România - Europa.

- "ușor" – Ex: întrebări foarte populare pentru un român (ex: "Care este capitala Franței?").
- "mediu" – Ex: necesită cunoștințe moderate (ex: "Când a avut loc Revoluția Franceză?").
- "greu" – Ex: întrebări de nișă (ex: "Care este formula chimică a clorurii de sodiu?").

**5. General:** recomandat 1, dar se pot pune maxim 3 atribute generale, care caracterizează domeniul/subiectul intrebarii. Nu vreau ceva specific. Doar super-general.
Exemple pentru "general":

- Messi - ["Fotbal"]
- Monalisa - ["Pictură", "Renaștere"]
- Titanic - ["Film"]
- Aria cecului - ["Geometrie"]

**Reguli esențiale:**

- **Diacritice**: - Toate valorile în română cu diacritice (cu excepția numelor proprii). - Cheile JSON rămân în engleză. - La `hints` maxim 2.

**Exemple JSON:**
// Exemple pentru întrebări despre steaguri
{
"question": {
"media": "/assets/database/images/steaguri-țări/Albania.png",
"hints": ["Steag din Balcani", "Conține o acvilă"]  
 },
"answer": {
"text": "Albania"
},
"tags": {
"domain": ["Geografie"],
"period": [""],
"region": ["Europa"],
"difficulty": "mediu",
"general": ["steag"]
}
},
{
"question": {
"media": "/assets/database/images/steaguri-țări/Andorra.png",
"hints": ["Steag european", "Stat mic"]
},
"answer": {
"text": "Andorra"
},
"tags": {
"domain": ["Geografie"],
"period": [""],
"region": ["Europa"],
"difficulty": "ușor",
"general": ["steag"]
}
}

// Exemple pentru întrebări despre animale
{
"question": {
"media": "/assets/database/images/animale/albină.jpg",
"hints": ["Produce miere", "Insectă polenizatoare"]
},
"answer": {
"text": "Albină"
},
"tags": {
"domain": ["Biologie"],
"period": [""],
"region": ["Global"],
"difficulty": "ușor",
"general": ["insectă"]
}
},
{
"question": {
"media": "/assets/database/images/animale/aligator.jpg",
"hints": ["Reptilă acvatică", "Asemănător cu crocodilul"]
},
"answer": {
"text": "Aligator"
},
"tags": {
"domain": ["Biologie"],
"period": [""],
"region": ["America"],
"difficulty": "mediu",
"general": ["reptilă"]
}
}

// Exemple pentru întrebări despre fructe
{
"question": {
"media": "/assets/database/images/fructe/ananas.jpg",
"hints": ["Fruct tropical", "Are coajă țepoasă"]
},
"answer": {
"text": "Ananas"
},
"tags": {
"domain": ["Biologie"],
"period": [""],
"region": ["America tropicală"],
"difficulty": "ușor",
"general": ["fruct"]
}
}

// Exemple pentru întrebări despre regi
{
"question": {
"media": "/assets/database/images/regi/carol_I.jpg",
"hints": ["Primul rege al României", "Din dinastia Hohenzollern"]
},
"answer": {
"text": "Carol I"
},
"tags": {
"domain": ["Istorie"],
"period": ["Secolul XIX"],
"region": ["România"],
"difficulty": "mediu",
"general": ["rege", "monarhie"]
}
},
{
"question": {
"media": "/assets/database/images/regi/ferdinand_I.jpg",
"hints": ["Rege al României Mari", "Cunoscut ca Întregitorul"]
},
"answer": {
"text": "Ferdinand I"
},
"tags": {
"domain": ["Istorie"],
"period": ["Secolul XX"],
"region": ["România"],
"difficulty": "mediu",
"general": ["rege", "monarhie"]
}
}

Setezi <numele-categoriei> = "fructe"
Setezi la toate "domain": ["Biologie"]
<Lista de fisiere>:
