/**
 * First names of earlier generations, by country: the common names of the 19th and early 20th
 * centuries (parish and civil registers, census and conscription records), for anyone born before
 * about 1950. US names come from the SSA's decade lists instead (names.js); this adds the older US
 * surnames (the commonest in the 1880–1940 censuses, before later immigration widened them).
 * Hand-compiled; see SOURCES.md.
 */
const ENGLISH = {
  male: ['John', 'William', 'James', 'George', 'Thomas', 'Charles', 'Henry', 'Arthur', 'Albert', 'Frederick', 'Edward', 'Joseph', 'Robert', 'Richard', 'Walter', 'Alfred', 'Harold', 'Ernest', 'Herbert', 'Frank', 'Samuel', 'Patrick', 'Michael', 'Francis', 'Hugh', 'Percy', 'Leonard', 'Stanley', 'Sidney', 'Reginald'],
  female: ['Mary', 'Elizabeth', 'Sarah', 'Margaret', 'Ann', 'Jane', 'Emily', 'Alice', 'Florence', 'Edith', 'Annie', 'Ellen', 'Catherine', 'Martha', 'Eliza', 'Dorothy', 'Doris', 'Ethel', 'Lilian', 'Edna', 'Ada', 'Bridget', 'Nora', 'Agnes', 'Mabel', 'Gladys', 'Winifred', 'Violet', 'Hilda', 'Elsie'],
};
const IRISH = { male: ['Patrick', 'John', 'Michael', 'James', 'Thomas', 'Daniel', 'Denis', 'Timothy', 'Cornelius', 'Bartholomew', 'Jeremiah', 'Martin', 'William', 'Edward', 'Hugh', 'Owen', 'Peter', 'Francis'], female: ['Mary', 'Bridget', 'Margaret', 'Catherine', 'Ellen', 'Johanna', 'Honora', 'Julia', 'Anne', 'Hannah', 'Kate', 'Nora', 'Brigid', 'Sarah', 'Eileen', 'Kathleen', 'Teresa', 'Agnes'] };
const GERMAN = {
  male: ['Johann', 'Friedrich', 'Wilhelm', 'Karl', 'Heinrich', 'Hermann', 'Otto', 'Ernst', 'August', 'Paul', 'Georg', 'Franz', 'Josef', 'Ludwig', 'Hans', 'Walter', 'Gustav', 'Max', 'Fritz', 'Richard', 'Kurt', 'Albert', 'Emil', 'Rudolf', 'Alois'],
  female: ['Anna', 'Maria', 'Elisabeth', 'Margarethe', 'Katharina', 'Bertha', 'Emma', 'Martha', 'Frieda', 'Hedwig', 'Klara', 'Luise', 'Johanna', 'Wilhelmine', 'Gertrud', 'Elsa', 'Ida', 'Auguste', 'Charlotte', 'Theresia', 'Franziska', 'Ottilie', 'Erna', 'Hildegard'],
};
const FRENCH = {
  male: ['Jean', 'Louis', 'Pierre', 'Joseph', 'François', 'Henri', 'Jacques', 'Paul', 'Charles', 'Auguste', 'Émile', 'Eugène', 'Marcel', 'Georges', 'André', 'Lucien', 'Victor', 'Alphonse', 'Jules', 'Léon', 'Gaston', 'Albert', 'René', 'Maurice'],
  female: ['Marie', 'Jeanne', 'Louise', 'Marguerite', 'Anne', 'Catherine', 'Françoise', 'Madeleine', 'Germaine', 'Suzanne', 'Berthe', 'Joséphine', 'Rose', 'Eugénie', 'Juliette', 'Augustine', 'Léontine', 'Marthe', 'Lucie', 'Henriette', 'Yvonne', 'Simone', 'Victorine', 'Adèle'],
};
const ITALIAN = {
  male: ['Giuseppe', 'Giovanni', 'Antonio', 'Francesco', 'Luigi', 'Angelo', 'Pietro', 'Vincenzo', 'Domenico', 'Carlo', 'Salvatore', 'Mario', 'Umberto', 'Vittorio', 'Pasquale', 'Michele', 'Gaetano', 'Raffaele', 'Battista', 'Enrico', 'Alfredo', 'Ernesto'],
  female: ['Maria', 'Giuseppina', 'Anna', 'Rosa', 'Teresa', 'Angela', 'Caterina', 'Lucia', 'Francesca', 'Carmela', 'Concetta', 'Assunta', 'Elisabetta', 'Margherita', 'Luigia', 'Antonietta', 'Filomena', 'Giovanna', 'Vincenza', 'Domenica', 'Emilia', 'Clementina'],
};
const SPANISH = {
  male: ['José', 'Juan', 'Manuel', 'Francisco', 'Antonio', 'Pedro', 'Joaquín', 'Ramón', 'Miguel', 'Luis', 'Rafael', 'Vicente', 'Fernando', 'Jesús', 'Agustín', 'Tomás', 'Ignacio', 'Andrés', 'Mariano', 'Saturnino', 'Gregorio', 'Eusebio'],
  female: ['María', 'Josefa', 'Carmen', 'Dolores', 'Francisca', 'Antonia', 'Juana', 'Manuela', 'Rosa', 'Isabel', 'Teresa', 'Pilar', 'Concepción', 'Mercedes', 'Ana', 'Rosario', 'Encarnación', 'Asunción', 'Remedios', 'Ramona', 'Petra', 'Catalina'],
};
const PORTUGUESE = {
  male: ['José', 'João', 'António', 'Manuel', 'Joaquim', 'Francisco', 'Domingos', 'Luís', 'Pedro', 'Bento', 'Sebastião', 'Agostinho', 'Albino', 'Custódio', 'Alfredo', 'Raimundo'],
  female: ['Maria', 'Ana', 'Rosa', 'Joaquina', 'Francisca', 'Antónia', 'Teresa', 'Luísa', 'Isabel', 'Benedita', 'Gertrudes', 'Margarida', 'Emília', 'Rita', 'Conceição', 'Amélia'],
};
const DUTCH = { male: ['Johannes', 'Jan', 'Cornelis', 'Hendrik', 'Willem', 'Pieter', 'Gerrit', 'Jacobus', 'Dirk', 'Adrianus', 'Gerardus', 'Antonius', 'Klaas', 'Hendrikus'], female: ['Maria', 'Johanna', 'Anna', 'Cornelia', 'Hendrika', 'Geertruida', 'Elisabeth', 'Wilhelmina', 'Catharina', 'Jacoba', 'Neeltje', 'Aaltje', 'Grietje', 'Pietertje'] };
const SWEDISH = { male: ['Johan', 'Karl', 'Carl', 'Erik', 'Anders', 'Gustaf', 'Lars', 'Per', 'Nils', 'Olof', 'Axel', 'Sven', 'Oskar', 'Fredrik', 'Gösta'], female: ['Anna', 'Maria', 'Kristina', 'Johanna', 'Karin', 'Elin', 'Hilda', 'Ingrid', 'Emma', 'Sofia', 'Margareta', 'Augusta', 'Hulda', 'Elsa', 'Greta'] };
const NORWEGIAN = { male: ['Ole', 'Hans', 'Johan', 'Anders', 'Lars', 'Olav', 'Peder', 'Nils', 'Martin', 'Knut', 'Halvor', 'Jens', 'Einar', 'Arne'], female: ['Anne', 'Marie', 'Ingeborg', 'Karen', 'Kari', 'Johanne', 'Martha', 'Gudrun', 'Ragnhild', 'Signe', 'Astrid', 'Inger', 'Birgit', 'Olga'] };
const DANISH = { male: ['Jens', 'Hans', 'Niels', 'Peder', 'Christian', 'Søren', 'Rasmus', 'Anders', 'Lars', 'Carl', 'Frederik', 'Poul', 'Knud', 'Aage'], female: ['Ane', 'Maren', 'Karen', 'Kirsten', 'Mette', 'Johanne', 'Marie', 'Inger', 'Anna', 'Dagmar', 'Ellen', 'Edel', 'Ingrid', 'Gudrun'] };
const FINNISH = { male: ['Juho', 'Johannes', 'Matti', 'Antti', 'Heikki', 'Kalle', 'Väinö', 'Toivo', 'Eino', 'Onni', 'Viljo', 'Uuno', 'Lauri', 'Arvo'], female: ['Maria', 'Anna', 'Hilma', 'Aino', 'Lyyli', 'Helmi', 'Saima', 'Ida', 'Lempi', 'Tyyne', 'Impi', 'Hilja', 'Elsa', 'Martta'] };
const POLISH = { male: ['Jan', 'Józef', 'Stanisław', 'Franciszek', 'Antoni', 'Władysław', 'Wojciech', 'Andrzej', 'Kazimierz', 'Tadeusz', 'Marian', 'Bolesław', 'Czesław', 'Ignacy'], female: ['Maria', 'Anna', 'Zofia', 'Katarzyna', 'Helena', 'Józefa', 'Marianna', 'Stanisława', 'Jadwiga', 'Franciszka', 'Agnieszka', 'Władysława', 'Bronisława', 'Wiktoria'] };
const RUSSIAN = { male: ['Ivan', 'Vasily', 'Nikolai', 'Mikhail', 'Pyotr', 'Alexei', 'Sergei', 'Fyodor', 'Grigory', 'Dmitry', 'Yakov', 'Stepan', 'Semyon', 'Afanasy', 'Pavel', 'Yegor'], female: ['Maria', 'Anna', 'Yekaterina', 'Yelena', 'Praskovya', 'Anastasia', 'Natalya', 'Olga', 'Avdotya', 'Agafya', 'Tatiana', 'Matryona', 'Darya', 'Pelageya', 'Akulina', 'Fyokla'] };
const UKRAINIAN = { male: ['Ivan', 'Petro', 'Mykola', 'Vasyl', 'Hryhoriy', 'Stepan', 'Andriy', 'Mykhailo', 'Fedir', 'Ostap', 'Taras', 'Semen'], female: ['Mariya', 'Hanna', 'Kateryna', 'Oksana', 'Paraska', 'Olena', 'Yevdokiya', 'Odarka', 'Khrystyna', 'Tetiana', 'Motrya', 'Varvara'] };
const GREEK = { male: ['Georgios', 'Ioannis', 'Konstantinos', 'Dimitrios', 'Nikolaos', 'Panagiotis', 'Vasileios', 'Christos', 'Athanasios', 'Michail', 'Spyridon', 'Evangelos'], female: ['Maria', 'Eleni', 'Aikaterini', 'Vasiliki', 'Sofia', 'Anastasia', 'Georgia', 'Panagiota', 'Kyriaki', 'Despoina', 'Paraskevi', 'Chrysoula'] };
const ROMANIAN = { male: ['Ion', 'Gheorghe', 'Vasile', 'Constantin', 'Nicolae', 'Ioan', 'Petre', 'Dumitru', 'Mihai', 'Alexandru', 'Iosif', 'Toader'], female: ['Maria', 'Elena', 'Ioana', 'Ana', 'Floarea', 'Elisabeta', 'Victoria', 'Paraschiva', 'Rodica', 'Aurelia', 'Zamfira', 'Safta'] };
const LITHUANIAN = { male: ['Jonas', 'Antanas', 'Juozas', 'Petras', 'Kazimieras', 'Vincas', 'Pranas', 'Stasys', 'Jurgis', 'Adomas'], female: ['Ona', 'Marija', 'Elžbieta', 'Kazimiera', 'Barbora', 'Agota', 'Veronika', 'Antanina', 'Petronėlė', 'Uršulė'] };
const LATVIAN = { male: ['Jānis', 'Kārlis', 'Pēteris', 'Andrejs', 'Juris', 'Krišjānis', 'Fricis', 'Indriķis', 'Mārtiņš', 'Ansis'], female: ['Anna', 'Marija', 'Līze', 'Emma', 'Lavīze', 'Grieta', 'Katrīna', 'Ilze', 'Made', 'Milda'] };
const ESTONIAN = { male: ['Johannes', 'Jaan', 'Juhan', 'Karl', 'Hans', 'Mihkel', 'Peeter', 'Jüri', 'August', 'Aleksander'], female: ['Anna', 'Marie', 'Liisa', 'Ann', 'Leena', 'Mari', 'Ella', 'Linda', 'Helene', 'Juuli'] };
const JAPANESE = { male: ['Tarō', 'Ichirō', 'Saburō', 'Shigeru', 'Kiyoshi', 'Minoru', 'Isamu', 'Tadashi', 'Hiroshi', 'Masao', 'Takeo', 'Kōichi', 'Yoshio', 'Shōji', 'Kenji'], female: ['Hana', 'Yoshi', 'Haru', 'Chiyo', 'Fumiko', 'Kiku', 'Sumi', 'Tome', 'Matsu', 'Haruko', 'Kazuko', 'Shizuko', 'Toshiko', 'Fusako', 'Masako'] };
const KOREAN = { male: ['Young-ho', 'Jong-hwan', 'Byung-chul', 'Chang-soo', 'Sang-hoon', 'Jae-sik', 'Ki-ho', 'Man-su', 'Bok-nam', 'Yong-sik', 'Chun-sik', 'Kap-dong'], female: ['Soon-ja', 'Young-ja', 'Jung-ja', 'Ok-soon', 'Mal-soon', 'Kyung-ja', 'Soon-ok', 'Bok-soon', 'Gap-soon', 'Geum-ja', 'Myung-ja', 'Sun-ja'] };
const CHINESE = { male: ['Fugui', 'Desheng', 'Baoshan', 'Zhiyuan', 'Shuren', 'Baoguo', 'Yongfu', 'Changsheng', 'Jinbao', 'Youcai', 'Jianguo', 'Shoushan'], female: ['Guiying', 'Xiuying', 'Yulan', 'Shufen', 'Guilan', 'Fengying', 'Xiuzhen', 'Guizhi', 'Shuzhen', 'Yuzhen', 'Cuihua', 'Suzhen'] };
const HEBREW = { male: ['Moshe', 'Avraham', 'Yitzhak', 'Yaakov', 'David', 'Shmuel', 'Yosef', 'Mordechai', 'Chaim', 'Shlomo', 'Zvi', 'Meir'], female: ['Sarah', 'Rivka', 'Rachel', 'Leah', 'Miriam', 'Chana', 'Esther', 'Malka', 'Devorah', 'Golda', 'Tzipora', 'Bluma'] };

/** Each country's older first names. */
export const OLD_FIRST_NAMES = {
  GB: ENGLISH, AU: ENGLISH, NZ: ENGLISH, CA: ENGLISH, JM: ENGLISH, BS: ENGLISH, IE: IRISH,
  DE: GERMAN, AT: GERMAN, CH: GERMAN, LU: GERMAN, FR: FRENCH, BE: FRENCH, IT: ITALIAN, MT: ITALIAN,
  ES: SPANISH, MX: SPANISH, AR: SPANISH, CO: SPANISH, PE: SPANISH, VE: SPANISH, CL: SPANISH, CR: SPANISH, GT: SPANISH, PA: SPANISH, PH: SPANISH,
  PT: PORTUGUESE, BR: PORTUGUESE, NL: DUTCH, SE: SWEDISH, NO: NORWEGIAN, DK: DANISH, FI: FINNISH,
  PL: POLISH, RU: RUSSIAN, UA: UKRAINIAN, GR: GREEK, CY: GREEK, RO: ROMANIAN, LT: LITHUANIAN, LV: LATVIAN, EE: ESTONIAN,
  JP: JAPANESE, KR: KOREAN, KP: KOREAN, CN: CHINESE, TW: CHINESE, IL: HEBREW,
};

/** The commonest US surnames of the 1880–1940 censuses. */
export const US_OLD_SURNAMES = [
  'Smith', 'Johnson', 'Brown', 'Williams', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Moore', 'Clark', 'White', 'Thompson', 'Martin', 'Hall', 'Allen',
  'Walker', 'Young', 'King', 'Wright', 'Lewis', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Roberts', 'Turner', 'Phillips', 'Campbell',
  'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Morris', 'Murphy', 'Cook', 'Rogers', 'Morgan', 'Cooper', 'Peterson', 'Reed', 'Bailey', 'Bell', 'Kelly', 'Howard',
  'Ward', 'Cox', 'Richardson', 'Wood', 'Watson', 'Brooks', 'Bennett', 'Gray', 'Hughes', 'Price', 'Sanders', 'Myers', 'Long', 'Ross', 'Foster', 'Jackson', 'Harris',
  'Robinson', 'Washington', 'Schmidt', 'Mueller', 'Weber', 'Wagner', 'Becker', "O'Brien", 'Sullivan', 'Kennedy', 'Ryan', 'Murray', 'Russo', 'Romano', 'Olson', 'Larson',
  'Hansen', 'Johansen', 'Kowalski', 'Novak', 'Cohen', 'Levy', 'Garcia', 'Martinez',
];
