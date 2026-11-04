/*
 * Notable sights of each destination city, keyed by the city's slug (the same slug as its photo file: city-<slug>.webp).
 * Every text is taken from the source named in `source` (Wikipedia). Every photo is a Wikimedia Commons file under the licence named in `photo.licence`.
 * A city without an entry here shows no sights section. Add a city only with its own sources and photos (see docs/image-attributions.md).
 */
(function () {
    window.AEROVA_CITY_SIGHTS = {
        paris: [
            {
                name: "Eyfel qülləsi",
                text: "1889-cu ildə Dünya Sərgisi münasibətilə tikilib və həmin ilin 31 martında tamamlanıb. Mühəndis Qustav Eyfelin şirkəti tərəfindən layihələndirilib.",
                source: { title: "Wikipedia: Eiffel Tower", url: "https://en.wikipedia.org/wiki/Eiffel_Tower" },
                image: "assets/images/sights/paris-eiffel-tower.webp",
                photo: { file: "Eiffel Tower and Pont Alexandre III at night.jpg", author: "Getfunky Paris", licence: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Eiffel_Tower_and_Pont_Alexandre_III_at_night.jpg" }
            },
            {
                name: "Luvr muzeyi",
                text: "Mona Lisa, Venera de Milo və Qələbə Nikesi kimi əsərləri saxlayan milli incəsənət muzeyidir. Muzey 1793-cü il avqustun 10-da açılıb.",
                source: { title: "Wikipedia: Louvre", url: "https://en.wikipedia.org/wiki/Louvre" },
                image: "assets/images/sights/paris-louvre.webp",
                photo: { file: "Louvre Pyramid and Cour Napoléon in Paris, July 2026 02.jpg", author: "Dev Jadiya", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Louvre_Pyramid_and_Cour_Napol%C3%A9on_in_Paris,_July_2026_02.jpg" }
            },
            {
                name: "Sakre-Kœr bazilikası",
                text: "Montmartre təpəsinin zirvəsində yerləşən Müqəddəs Ürək bazilikasıdır. Tikintisi 1875-ci ildə başlayıb, 1914-cü ildə tamamlanıb.",
                source: { title: "Wikipedia: Sacré-Cœur, Paris", url: "https://en.wikipedia.org/wiki/Sacr%C3%A9-C%C5%93ur,_Paris" },
                image: "assets/images/sights/paris-sacre-coeur.webp",
                photo: { file: "Paris, Sacré-Cœur de Montmartre -- 2014 -- 1193.jpg", author: "Dietmar Rabich", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Paris,_Sacr%C3%A9-C%C5%93ur_de_Montmartre_--_2014_--_1193.jpg" }
            }
        ],
        tokyo: [
            {
                name: "Sensō-ji məbədi",
                text: "Asakusa bölgəsində, Kannon bodhisattvasına həsr olunmuş Tokionun ən qədim buddist məbədlərindən biridir. Ənənəyə görə 628-ci ildə başlanıb, 645-ci ildə bərpa olunub.",
                source: { title: "Wikipedia: Sensō-ji", url: "https://en.wikipedia.org/wiki/Senso-ji" },
                image: "assets/images/sights/tokyo-senso-ji.webp",
                photo: { file: "Senso-ji Kaminarimon 1.jpg", author: "Zairon", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Senso-ji_Kaminarimon_1.jpg" }
            },
            {
                name: "Meiji Şrini",
                text: "Şibuyada, İmperator Meiji və İmperatriça Şokenin ruhlarına həsr olunmuş Şinto məbədidir. Məbəd İkinci Dünya Müharibəsində dağıdılıb; hazırkı tikili 1958-ci ildə tamamlanıb.",
                source: { title: "Wikipedia: Meiji Shrine", url: "https://en.wikipedia.org/wiki/Meiji_Shrine" },
                image: "assets/images/sights/tokyo-meiji-shrine.webp",
                photo: { file: "Meiji Shrine Minami-sando-torii 2023-01-26.jpg", author: "Asanagi", licence: "CC0", url: "https://commons.wikimedia.org/wiki/File:Meiji_Shrine_Minami-sando-torii_2023-01-26.jpg" }
            }
        ],
        istanbul: [
            {
                name: "Ayasofya",
                text: "537-ci ildə tamamlanan bu tikili 1453-cü ilədək kilsə, 1935–2020-ci illərdə muzey, 2020-ci ildən isə məscid olub.",
                source: { title: "Wikipedia: Hagia Sophia", url: "https://en.wikipedia.org/wiki/Hagia_Sophia" },
                image: "assets/images/sights/istanbul-hagia-sophia.webp",
                photo: { file: "Exterior of Hagia Sophia (1) - Istanbul (2022).jpg", author: "ImanFakhri", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Exterior_of_Hagia_Sophia_(1)_-_Istanbul_(2022).jpg" }
            },
            {
                name: "Topkapı sarayı",
                text: "1459-cu ildə tikintisi başlanan saray 1853-cü ilədək, Dolmabağça sarayı tamamlanana qədər Osmanlı sultanlarının əsas iqamətgahı və inzibati mərkəzi olub.",
                source: { title: "Wikipedia: Topkapı Palace", url: "https://en.wikipedia.org/wiki/Topkapi_Palace" },
                image: "assets/images/sights/istanbul-topkapi-palace.webp",
                photo: { file: "Grand Kiosk of Topkapı Palace in Istanbul, Turkey 002.jpg", author: "Moonik", licence: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:Grand_Kiosk_of_Topkap%C4%B1_Palace_in_Istanbul,_Turkey_002.jpg" }
            }
        ],
        ganja: [
            {
                name: "Cümə məscidi",
                text: "Şah Abbas məscidi adı ilə də tanınan bu məscid Gəncənin mərkəzində yerləşir. 1606-cı ildə Böyük Şah Abbasın sərəncamı ilə tikilib.",
                source: { title: "Wikipedia: Juma Mosque, Ganja", url: "https://en.wikipedia.org/wiki/Juma_Mosque,_Ganja" },
                image: "assets/images/sights/ganja-juma-mosque.webp",
                photo: { file: "Ganja Juma mosque 2018.jpg", author: "Sefer azeri", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Ganja_Juma_mosque_2018.jpg" }
            }
        ],
        nakhchivan: [
            {
                name: "Məmmə Xatun türbəsi",
                text: "Naxçıvanda yerləşən on bucaqlı türbə 1186-cı ildə tikilib. Memarı Əcəmi ibn Əbubəkr Naxçıvanidir; tikilinin ilkin hündürlüyü təxminən 34 metr olub.",
                source: { title: "Wikipedia: Momine Khatun Mausoleum", url: "https://en.wikipedia.org/wiki/Momine_Khatun_Mausoleum" },
                image: "assets/images/sights/nakhchivan-momine-khatun.webp",
                photo: { file: "Momine Hatoon Mausoleum.jpg", author: "Fuad2006", licence: "CC BY 2.5", url: "https://commons.wikimedia.org/wiki/File:Momine_Hatoon_Mausoleum.jpg" }
            }
        ],
        antalya: [
            {
                name: "Hadrian qapısı",
                text: "Roma imperatoru Hadrianın şərəfinə tikilmiş memorial qapıdır; təqribən eramızın 150-ci ilində inşa olunub. Şəhər divarlarının sağ qalmış yeganə giriş qapısıdır.",
                source: { title: "Wikipedia: Hadrian's Gate", url: "https://en.wikipedia.org/wiki/Hadrian%27s_Gate" },
                image: "assets/images/sights/antalya-hadrians-gate.webp",
                photo: { file: "2023-01-17 Hadrian's Gate in Antalya 1.jpg", author: "Maksym Kozlenko", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:2023-01-17_Hadrian%27s_Gate_in_Antalya_1.jpg" }
            },
            {
                name: "Kaleyçi",
                text: "Antalyanın tarixi mərkəzi olan Kaleyçi qədim şəhər divarları ilə əhatə olunub və limanın üzərində yerləşir. Romanın, Bizansın, Səlcuqların və Osmanlının memarlıq izlərini daşıyır.",
                source: { title: "Wikipedia: Kaleiçi", url: "https://en.wikipedia.org/wiki/Kale%C3%A7i" },
                image: "assets/images/sights/antalya-kaleici.webp",
                photo: { file: "Antalya Kaleiçi walls in 2011 03.jpg", author: "Dosseman", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Antalya_Kalei%C3%A7i_walls_in_2011_03.jpg" }
            }
        ],
        bodrum: [
            {
                name: "Bodrum qalası",
                text: "Müqəddəs Pyotr qalası adı ilə Müqəddəs İohann cəngavərləri (hospitallar) tərəfindən 1402-ci ildən başlayaraq tikilib. Dörd qülləsi müxtəlif millətlərin maliyyəsi ilə inşa olunub.",
                source: { title: "Wikipedia: Bodrum Castle", url: "https://en.wikipedia.org/wiki/Bodrum_Castle" },
                image: "assets/images/sights/bodrum-castle.webp",
                photo: { file: "Bodrum Castle (2017).jpg", author: "Serhio Magpie", licence: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:Bodrum_Castle_(2017).jpg" }
            },
            {
                name: "Halikarnas Məqbərəsi",
                text: "Qarlar hökmdarı Mausolus və bacısı-arvadı Artemisiya üçün Halikarnasda (indiki Bodrum) tikilib. Eramızdan əvvəl 353–351-ci illərdə inşa edilib.",
                source: { title: "Wikipedia: Mausoleum at Halicarnassus", url: "https://en.wikipedia.org/wiki/Mausoleum_at_Halicarnassus" },
                image: "assets/images/sights/bodrum-mausoleum.webp",
                photo: { file: "The ruins of the Mausoleum at Halicarnassus.jpg", author: "FollowingHadrian", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:The_ruins_of_the_Mausoleum_at_Halicarnassus.jpg" }
            }
        ],
        dubai: [
            {
                name: "Burj Khalifa",
                text: "Dünyanın ən hündür binasıdır; tikintisi 2009-cu ilin oktyabrında tamamlanıb. 2011-ci ildən bəri ən hündür bina statusunu saxlayır.",
                source: { title: "Wikipedia: Burj Khalifa", url: "https://en.wikipedia.org/wiki/Burj_Khalifa" },
                image: "assets/images/sights/dubai-burj-khalifa.webp",
                photo: { file: "Burj Khalifa, Dubai, United Arab Emirates (49785874568).jpg", author: "Like My Travel from Peru", licence: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Burj_Khalifa,_Dubai,_United_Arab_Emirates_(49785874568).jpg" }
            },
            {
                name: "Burj Əl Ərəb",
                text: "Süni adada, Cümeyra çimərliyindən təxminən 280 metr məsafədə yerləşən lüks oteldir. 1999-cu ilin dekabrında açılıb.",
                source: { title: "Wikipedia: Burj Al Arab", url: "https://en.wikipedia.org/wiki/Burj_Al_Arab" },
                image: "assets/images/sights/dubai-burj-al-arab.webp",
                photo: { file: "Burj Al Arab, Dubai.jpg", author: "Heba Hashem", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Burj_Al_Arab,_Dubai.jpg" }
            }
        ],
        "abu-dhabi": [
            {
                name: "Şeyx Zayed Böyük Məscidi",
                text: "Birləşmiş Ərəb Əmirliklərinin ən böyük məscididir və gündəlik namazların əsas məkanıdır. 2007-ci ilin dekabrında açılıb.",
                source: { title: "Wikipedia: Sheikh Zayed Grand Mosque", url: "https://en.wikipedia.org/wiki/Sheikh_Zayed_Grand_Mosque" },
                image: "assets/images/sights/abu-dhabi-grand-mosque.webp",
                photo: { file: "Sheikh Zayed Grand Mosque @ Abu Dhabi (15856602738).jpg", author: "Guilhem Vellut from Annecy", licence: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Sheikh_Zayed_Grand_Mosque_@_Abu_Dhabi_(15856602738).jpg" }
            }
        ],
        london: [
            {
                name: "Tower Bridge",
                text: "Temza çayı üzərində, Tauer qalasının yaxınlığında yerləşən körpüdür. 1886–1894-cü illərdə tikilib və 1894-cü ildə açılıb.",
                source: { title: "Wikipedia: Tower Bridge", url: "https://en.wikipedia.org/wiki/Tower_Bridge" },
                image: "assets/images/sights/london-tower-bridge.webp",
                photo: { file: "London, Tower Bridge -- 2016 -- 4676.jpg", author: "Dietmar Rabich", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:London,_Tower_Bridge_--_2016_--_4676.jpg" }
            }
        ],
        manchester: [
            {
                name: "Manchester ratuşası",
                text: "Viktoriya dövrünün neo-qotik üslubunda tikilmiş şəhər binasıdır; 1877-ci ildə tamamlanıb. Manchester şəhər şurasının mərasim qərargahıdır.",
                source: { title: "Wikipedia: Manchester Town Hall", url: "https://en.wikipedia.org/wiki/Manchester_Town_Hall" },
                image: "assets/images/sights/manchester-town-hall.webp",
                photo: { file: "Manchester town hall.jpg", author: "Julius (User:Juliux)", licence: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:Manchester_town_hall.jpg" }
            },
            {
                name: "John Rylands Kitabxanası",
                text: "Dekan küçəsində yerləşən, Viktoriya dövrünün sonunda tikilmiş neo-qotik binadır. 1900-cü ildə açılıb və Manchester Universitetinin tərkib hissəsidir.",
                source: { title: "Wikipedia: John Rylands Library", url: "https://en.wikipedia.org/wiki/John_Rylands_Library" },
                image: "assets/images/sights/manchester-rylands.webp",
                photo: { file: "The John Rylands Library - geograph.org.uk - 5543968.jpg", author: "Phil and Juliette Platt", licence: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:The_John_Rylands_Library_-_geograph.org.uk_-_5543968.jpg" }
            }
        ],
        edinburgh: [
            {
                name: "Edinburq qalası",
                text: "Qala Castle Rock təpəsində yerləşir. XI əsrdə III Malkolmun dövründən kral qalası olub və 1633-cü ilə qədər kral iqamətgahı kimi istifadə edilib.",
                source: { title: "Wikipedia: Edinburgh Castle", url: "https://en.wikipedia.org/wiki/Edinburgh_Castle" },
                image: "assets/images/sights/edinburgh-castle.webp",
                photo: { file: "Castle Rock Edinburgh.jpg", author: "Scglossop1", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Castle_Rock_Edinburgh.jpg" }
            },
            {
                name: "Holyrood sarayı",
                text: "Şotlandiyada monarxın rəsmi iqamətgahıdır. Royal Mile küçəsinin aşağı ucunda, Edinburq qalasının qarşısında yerləşir; əsas hissəsi 1671–1678-ci illərdə tikilib.",
                source: { title: "Wikipedia: Palace of Holyroodhouse", url: "https://en.wikipedia.org/wiki/Palace_of_Holyroodhouse" },
                image: "assets/images/sights/edinburgh-holyrood.webp",
                photo: { file: "Edinburgh Holyrood Palace-20110904-RM-130303.jpg", author: "Ermell", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Edinburgh_Holyrood_Palace-20110904-RM-130303.jpg" }
            }
        ],
        marseille: [
            {
                name: "Notre-Dame de la Garde",
                text: "Marselin ən tanınmış simvollarından biri olan bazilikadır. Şəhərin ən yüksək nöqtəsində, köhnə fortun qalıqları üzərində yerləşir və 1897-ci ildə tamamlanıb.",
                source: { title: "Wikipedia: Notre-Dame de la Garde", url: "https://en.wikipedia.org/wiki/Notre-Dame_de_la_Garde" },
                image: "assets/images/sights/marseille-notre-dame-de-la-garde.webp",
                photo: { file: "Notre-Dame-de-la-Garde (Marseille).jpg", author: "Anfrx", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Notre-Dame-de-la-Garde_(Marseille).jpg" }
            }
        ],
        berlin: [
            {
                name: "Brandenburq qapısı",
                text: "XVIII əsrin neoklassik abidəsidir. Kral II Fridrix Vilhelmin sərəncamı ilə, kral memarı Karl Qotthard Lanqhansın layihəsi üzrə tikilib və 1791-ci ildə tamamlanıb.",
                source: { title: "Wikipedia: Brandenburg Gate", url: "https://en.wikipedia.org/wiki/Brandenburg_Gate" },
                image: "assets/images/sights/berlin-brandenburg-gate.webp",
                photo: { file: "Brandenburg Gate - Brandenburger Tor - Berlin - Germany - 01.jpg", author: "Norbert Nagel", licence: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:Brandenburg_Gate_-_Brandenburger_Tor_-_Berlin_-_Germany_-_01.jpg" }
            }
        ],
        munich: [
            {
                name: "Frauenkirche",
                text: "Münhen arxiyepiskopluğunun kafedral kilsəsi və Bavariya paytaxtının simvollarından biridir. Kilsənin qübbələri 1524-cü ildə əlavə olunub.",
                source: { title: "Wikipedia: Frauenkirche, Munich", url: "https://en.wikipedia.org/wiki/Frauenkirche,_Munich" },
                image: "assets/images/sights/munich-frauenkirche.webp",
                photo: { file: "Frauenkirche Munich, March 2018.jpg", author: "Martin Falbisoner", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Frauenkirche_Munich,_March_2018.jpg" }
            }
        ],
        frankfurt: [
            {
                name: "Römer",
                text: "Orta əsrlərə aid, Frankfurtun köhnə şəhərində yerləşən binalar kompleksidir. 1405-ci ildə şəhər şurasına satılıb və altı əsrdən çoxdur ki, şəhər ratuşudur.",
                source: { title: "Wikipedia: Römer", url: "https://en.wikipedia.org/wiki/R%C3%B6mer" },
                image: "assets/images/sights/frankfurt-roemer.webp",
                photo: { file: "Frankfurt am Main, Römer -- 2015 -- 6695-9.jpg", author: "Dietmar Rabich", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Frankfurt_am_Main,_R%C3%B6mer_--_2015_--_6695-9.jpg" }
            }
        ],
        rome: [
            {
                name: "Kolizey",
                text: "Roma mərkəzində yerləşən oval amfiteatrdır və dünyada ayaqda qalmış ən böyük qədim amfiteatrdır. Tikintisi eramızın 72-ci ilində İmperator Vespasian dövründə başlayıb, 80-ci ildə İmperator Titus dövründə tamamlanıb.",
                source: { title: "Wikipedia: Colosseum", url: "https://en.wikipedia.org/wiki/Colosseum" },
                image: "assets/images/sights/rome-colosseum.webp",
                photo: { file: "Colosseum and Via Sacra (Rome).jpg", author: "Livioandronico2013", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Colosseum_and_Via_Sacra_(Rome).jpg" }
            }
        ],
        milan: [
            {
                name: "Milan Katedrali",
                text: "Lombardiyanın mərkəzində yerləşən kafedral kilsədir. Tikintisi 1386-cı ildə başlayıb və son təfərrüatları 1965-ci ildə tamamlanıb.",
                source: { title: "Wikipedia: Milan Cathedral", url: "https://en.wikipedia.org/wiki/Milan_Cathedral" },
                image: "assets/images/sights/milan-cathedral.webp",
                photo: { file: "Duomo di Milano (Ank kumar, Infosys Limited) 05.jpg", author: "Ank kumar", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Duomo_di_Milano_(Ank_kumar,_Infosys_Limited)_05.jpg" }
            }
        ],
        venice: [
            {
                name: "Müqəddəs Mark bazilikası",
                text: "Venesiyanın patron azizi Müqəddəs Markın qalıqlarını saxlayır. Müqəddəs Mark meydanının şərq ucunda, Dojlar sarayına bitişik yerləşir.",
                source: { title: "Wikipedia: St. Mark's Basilica", url: "https://en.wikipedia.org/wiki/St._Mark%27s_Basilica" },
                image: "assets/images/sights/venice-st-marks.webp",
                photo: { file: "Basilica San Marco facciata sud Venezia.jpg", author: "Wikimedia Commons (müəllif fayl səhifəsində)", licence: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:Basilica_San_Marco_facciata_sud_Venezia.jpg" }
            }
        ],
        madrid: [
            {
                name: "Kral sarayı",
                text: "İspaniya kral ailəsinin rəsmi iqamətgahıdır və Avropanın ən böyük kral sarayı sayılır. 1738–1755-ci illərdə tikilib.",
                source: { title: "Wikipedia: Royal Palace of Madrid", url: "https://en.wikipedia.org/wiki/Royal_Palace_of_Madrid" },
                image: "assets/images/sights/madrid-royal-palace.webp",
                photo: { file: "Palacio Real de Madrid - 01.jpg", author: "Carlos Delgado", licence: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:Palacio_Real_de_Madrid_-_01.jpg" }
            }
        ],
        barcelona: [
            {
                name: "Sagrada Família",
                text: "Antoni Qaudinin layihəsi ilə Eixample bölgəsində tikilən bazilikadır və hazırda dünyanın ən hündür kilsəsidir. Tikintisi 1882-ci il martın 19-da başlayıb.",
                source: { title: "Wikipedia: Sagrada Família", url: "https://en.wikipedia.org/wiki/Sagrada_Fam%C3%ADlia" },
                image: "assets/images/sights/barcelona-sagrada-familia.webp",
                photo: { file: "Barcelona - La Sagrada Família - Nativity Façade.jpg", author: "Txllxt TxllxT", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Barcelona_-_La_Sagrada_Fam%C3%ADlia_-_Nativity_Fa%C3%A7ade.jpg" }
            }
        ],
        malaga: [
            {
                name: "Alkasaba",
                text: "Malaqa şəhərinin üzərində yerləşən, Əl-Əndəlüs dövründən qalma saray-qala kompleksidir. Tikintisinə XI əsrdə başlanıb və XIV əsrə qədər dəfələrlə dəyişdirilib.",
                source: { title: "Wikipedia: Alcazaba of Málaga", url: "https://en.wikipedia.org/wiki/Alcazaba_of_M%C3%A1laga" },
                image: "assets/images/sights/malaga-alcazaba.webp",
                photo: { file: "Alcazaba, Málaga, España, 2023-05-20, DD 101.jpg", author: "Diego Delso", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Alcazaba,_M%C3%A1laga,_Espa%C3%B1a,_2023-05-20,_DD_101.jpg" }
            }
        ],
        athens: [
            {
                name: "Akropol və Parfenon",
                text: "Afinanın üzərindəki təpədə yerləşən qədim qalıq kompleksidir. Ən məşhur tikilisi olan Parfenon Perikl dövründə, eramızdan əvvəl V əsrdə inşa olunub.",
                source: { title: "Wikipedia: Acropolis of Athens", url: "https://en.wikipedia.org/wiki/Acropolis_of_Athens" },
                image: "assets/images/sights/athens-parthenon.webp",
                photo: { file: "Colonnade Parthenon Acropolis, Athens, Greece.jpg", author: "Jebulon", licence: "CC0", url: "https://commons.wikimedia.org/wiki/File:Colonnade_Parthenon_Acropolis,_Athens,_Greece.jpg" }
            }
        ],
        santorini: [
            {
                name: "Santorini adası",
                text: "Egey dənizinin cənubundakı vulkanik adadır və kalderanın əmələ gətirdiyi halqavari adalar qrupunun ən böyüyüdür. Oia kəndi də bu adadadır.",
                source: { title: "Wikipedia: Santorini", url: "https://en.wikipedia.org/wiki/Santorini" },
                image: "assets/images/sights/santorini-oia.webp",
                photo: { file: "07-17-2012 - Oia - Santorini - Greece - 37.jpg", author: "Norbert Nagel", licence: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:07-17-2012_-_Oia_-_Santorini_-_Greece_-_37.jpg" }
            }
        ],
        mykonos: [
            {
                name: "Mikonos şəhəri (Xora)",
                text: "Mikonos adasının əsas şəhəridir və adanın qərb sahilində yerləşir.",
                source: { title: "Wikipedia: Mykonos", url: "https://en.wikipedia.org/wiki/Mykonos" },
                image: "assets/images/sights/mykonos-chora.webp",
                photo: { file: "Lower windmills in Chora of Mykonos, 060205.jpg", author: "Zde", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Lower_windmills_in_Chora_of_Mykonos,_060205.jpg" }
            }
        ],
        vienna: [
            {
                name: "Müqəddəs Stefan kafedrali",
                text: "Vyana arxiyepiskopluğunun ana kilsəsidir. Tikintisi 1137-ci ildə başlayıb və Roma-Qotik üslubu əsasən XIV əsrdə, IV Rudolfun dövründə formalaşıb.",
                source: { title: "Wikipedia: St. Stephen's Cathedral, Vienna", url: "https://en.wikipedia.org/wiki/St._Stephen%27s_Cathedral,_Vienna" },
                image: "assets/images/sights/vienna-stephansdom.webp",
                photo: { file: "St. Stephen's Cathedral Tower roof - Vienna.jpg", author: "MrPanyGoff", licence: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:St._Stephen%27s_Cathedral_Tower_roof_-_Vienna.jpg" }
            },
            {
                name: "Şönbrunn sarayı",
                text: "Habsburqların əsas yay iqamətgahı olmuş, 1441 otaqlı barokko sarayıdır. Bugünkü formasını XVIII əsrdə, İmperatriça Mariya Terezanın dövründə alıb.",
                source: { title: "Wikipedia: Schönbrunn Palace", url: "https://en.wikipedia.org/wiki/Sch%C3%B6nbrunn_Palace" },
                image: "assets/images/sights/vienna-schonbrunn.webp",
                photo: { file: "Palacio de Schönbrunn, Viena, Austria, 2020-02-02, DD 37.jpg", author: "Diego Delso", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Palacio_de_Sch%C3%B6nbrunn,_Viena,_Austria,_2020-02-02,_DD_37.jpg" }
            }
        ],
        salzburg: [
            {
                name: "Hohensalzburg qalası",
                text: "Salsburqun Festungsberg təpəsində yerləşən böyük orta əsr qalasıdır. Tikintisinin əsası 1077-ci ildə qoyulub.",
                source: { title: "Wikipedia: Hohensalzburg Fortress", url: "https://en.wikipedia.org/wiki/Hohensalzburg_Fortress" },
                image: "assets/images/sights/salzburg-hohensalzburg.webp",
                photo: { file: "Festung Hohensalzburg (57).jpg", author: "1971markus", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Festung_Hohensalzburg_(57).jpg" }
            }
        ],
        "new-york": [
            {
                name: "Azadlıq heykəli",
                text: "Liberty adasında, Nyu-York limanında yerləşən neoklassik heykəldir. Fransa tərəfindən ABŞ-yə bağışlanıb və 1886-cı il oktyabrın 28-də açılıb.",
                source: { title: "Wikipedia: Statue of Liberty", url: "https://en.wikipedia.org/wiki/Statue_of_Liberty" },
                image: "assets/images/sights/newyork-liberty.webp",
                photo: { file: "New York City (New York, USA), Statue of Liberty -- 2012 -- 6660.jpg", author: "Dietmar Rabich", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:New_York_City_(New_York,_USA),_Statue_of_Liberty_--_2012_--_6660.jpg" }
            }
        ],
        "los-angeles": [
            {
                name: "Qriffit Rəsədxanası",
                text: "Qriffit parkında, Hollivud təpəsinin yamacında yerləşir. 1935-ci il mayın 14-də açılıb və şəhərin geniş mənzərəsini təqdim edir.",
                source: { title: "Wikipedia: Griffith Observatory", url: "https://en.wikipedia.org/wiki/Griffith_Observatory" },
                image: "assets/images/sights/la-griffith.webp",
                photo: { file: "Griffith Observatory 2012 01.jpg", author: "Mike Peel", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Griffith_Observatory_2012_01.jpg" }
            }
        ],
        miami: [
            {
                name: "Vizkaya muzeyi və bağları",
                text: "Biskayn körfəzində yerləşən keçmiş villa və mülkdür. İtalyan Rönesansı üslubunda bağları var; tikintisi 1912–1923-cü illərdə aparılıb.",
                source: { title: "Wikipedia: Vizcaya Museum and Gardens", url: "https://en.wikipedia.org/wiki/Vizcaya_Museum_and_Gardens" },
                image: "assets/images/sights/miami-vizcaya.webp",
                photo: { file: "Vizcaya Museum and Gardens 060524 DSC6664.jpg", author: "Leslie Platt", licence: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Vizcaya_Museum_and_Gardens_060524_DSC6664.jpg" }
            }
        ],
        lisbon: [
            {
                name: "Belém qülləsi",
                text: "XVI əsrdə tikilmiş qala olub, Portuqal kəşfiyyatçılarının yola düşdüyü və qayıtdığı limanda yerləşir. Tikintisinə 1514-cü ildə başlanıb, 1519-cu ildə tamamlanıb.",
                source: { title: "Wikipedia: Belém Tower", url: "https://en.wikipedia.org/wiki/Bel%C3%A9m_Tower" },
                image: "assets/images/sights/lisbon-belem.webp",
                photo: { file: "Lisbon Torre de Belém BW 2018-10-03 16-33-21.jpg", author: "Berthold Werner", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Lisbon_Torre_de_Bel%C3%A9m_BW_2018-10-03_16-33-21.jpg" }
            },
            {
                name: "Jeronimuş monastırı",
                text: "Belemdə yerləşən, geç portuqal qotikasının nümunəsi olan manuel üslubunda inşa edilmiş keçmiş monastırdır. Tikintisi 1501-ci il yanvarın 6-da başlayıb.",
                source: { title: "Wikipedia: Jerónimos Monastery", url: "https://en.wikipedia.org/wiki/Jer%C3%B3nimos_Monastery" },
                image: "assets/images/sights/lisbon-jeronimos.webp",
                photo: { file: "Jerónimos Monastery in Belém, Lisbon, 20250604 1205 9141.jpg", author: "Jakub Hałun", licence: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:Jer%C3%B3nimos_Monastery_in_Bel%C3%A9m,_Lisbon,_20250604_1205_9141.jpg" }
            }
        ],
        porto: [
            {
                name: "Dom Luís I körpüsü",
                text: "Duero çayı üzərində Portonu Vila Nova de Qaya ilə birləşdirən, iki səviyyəli metal tağlı körpüdür. 1886-cı il oktyabrın 31-də açılıb.",
                source: { title: "Wikipedia: Dom Luís I Bridge", url: "https://en.wikipedia.org/wiki/Dom_Lu%C3%ADs_I_Bridge" },
                image: "assets/images/sights/porto-luis.webp",
                photo: { file: "Dom Luis I bridge from Jardim do Morro (1).jpg", author: "Krzysztof Golik", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Dom_Luis_I_bridge_from_Jardim_do_Morro_(1).jpg" }
            }
        ],
        osaka: [
            {
                name: "Osaka qalası",
                text: "Yaponiyanın ən tanınmış simvollarından biridir. 1583-cü ildə Toyotomi Hideyoşi tərəfindən tikilib; əsas qülləsi 1931-ci ildə yenidən inşa edilib.",
                source: { title: "Wikipedia: Osaka Castle", url: "https://en.wikipedia.org/wiki/Osaka_Castle" },
                image: "assets/images/sights/osaka-castle.webp",
                photo: { file: "Osaka castle 11.jpg", author: "Syced", licence: "CC0", url: "https://commons.wikimedia.org/wiki/File:Osaka_castle_11.jpg" }
            }
        ],
        bangkok: [
            {
                name: "Arun məbədi",
                text: "Çao Praya çayının qərb sahilində, Toncburi tərəfdə yerləşən buddist məbədidir. Əsas pranqı (qüllə) 1851-ci ildə tamamlanıb.",
                source: { title: "Wikipedia: Wat Arun", url: "https://en.wikipedia.org/wiki/Wat_Arun" },
                image: "assets/images/sights/bangkok-wat-arun.webp",
                photo: { file: "20160727 Wat Arun Bangkok 5532.jpg", author: "Jakub Hałun", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:20160727_Wat_Arun_Bangkok_5532.jpg" }
            },
            {
                name: "Böyük saray",
                text: "1782-ci ildən Siam (sonra Tailand) kralları üçün rəsmi iqamətgah olub. Tikintisi 1782-ci il mayın 6-da başlayıb.",
                source: { title: "Wikipedia: Grand Palace", url: "https://en.wikipedia.org/wiki/Grand_Palace" },
                image: "assets/images/sights/bangkok-grand-palace.webp",
                photo: { file: "Grand Palace, Bangkok-3.jpg", author: "Immanuelle", licence: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:Grand_Palace,_Bangkok-3.jpg" }
            }
        ],
        faro: [
            {
                name: "Sümük kapellası",
                text: "Faro şəhərində, Karmelit Nossa Senhora do Carmo kilsəsinin tərkibində yerləşən sümük kapellasıdır. Kilsə XVIII əsrə aiddir.",
                source: { title: "Wikipedia: Faro, Portugal", url: "https://en.wikipedia.org/wiki/Faro,_Portugal" },
                image: "assets/images/sights/faro-capela-dos-ossos.webp",
                photo: { file: "Capela dos Ossos (Faro).JPG", author: "Wasquewhat", licence: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:Capela_dos_Ossos_(Faro).JPG" }
            }
        ]
    };
})();
