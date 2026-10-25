# Standalone Web-Research Agent Prompt: Generate 300+ JAMB Courses & Subject Combinations CSV

Copy and paste the prompt below into any web-browsing AI agent (no codebase access required).

---

```markdown
You are an expert Nigerian tertiary education and JAMB UTME curriculum researcher.

Your task is to search the web—specifically the official JAMB Integrated Brochure and Syllabus System (**IBASS**, `ibass.jamb.gov.ng`), official JAMB UTME Brochure faculty documents, and authoritative Nigerian university/polytechnic/college admission directories—and generate a **downloadable CSV file (`jamb_courses_combinations.csv`)** containing **at least 300 distinct accredited degree courses offered in Nigeria** and their official JAMB UTME 4-subject combinations.

---

### 1. STRICT SUBJECT LIST (25 Official JAMB Subjects Only)

Every subject code and name you use in the CSV MUST come strictly from this exact list of 25 JAMB subjects (do not invent other codes):

| Code | Exact Subject Name |
| :--- | :--- |
| `ENG` | Use of English |
| `MTH` | Mathematics |
| `PHY` | Physics |
| `CHM` | Chemistry |
| `BIO` | Biology |
| `AGR` | Agricultural Science |
| `GEO` | Geography |
| `CMP` | Computer Studies |
| `PHE` | Physical and Health Education |
| `HEC` | Home Economics |
| `ECN` | Economics |
| `GOV` | Government |
| `COM` | Commerce |
| `ACC` | Principles of Accounting |
| `LIT` | Literature in English |
| `CRK` | Christian Religious Knowledge |
| `IRS` | Islamic Religious Studies |
| `HIS` | History |
| `ARB` | Arabic |
| `ART` | Art |
| `FRN` | French |
| `HAU` | Hausa |
| `IGB` | Igbo |
| `MUS` | Music |
| `YOR` | Yoruba |

---

### 2. REQUIRED CSV COLUMNS (Exact Header Row)

The CSV file MUST use this exact 13-column header row:

```csv
course_id,course_title,faculty,aliases,compulsory_code,core_elective_codes,flexible_pick_count,flexible_slot_label,flexible_allowed_codes,flexible_default_codes,recommended_target_score,competitive_score_range,ibass_note
```

#### Column Rules & Formatting:
1. **`course_id`**: Lowercase URL-safe slug (e.g., `medicine-and-surgery`, `computer-science`, `common-law`, `education-and-biology`). Must be unique across all rows.
2. **`course_title`**: Official course name in Nigeria (e.g., `Medicine and Surgery`, `Computer Science`, `Mass Communication`, `Accounting`).
3. **`faculty`**: Must be one of these exact 9 strings:
   - `Medical & Health Sciences`
   - `Engineering & Technology`
   - `Sciences & Computing`
   - `Law`
   - `Social Sciences`
   - `Management & Commercial`
   - `Arts & Humanities`
   - `Agriculture & Environmental`
   - `Education`
4. **`aliases`**: Pipe-separated (`|`) list of common search terms, abbreviations, and Nigerian student slang for the course (e.g., `mbbs|medicine|doctor|med surg` or `csc|comp sci|computing`).
5. **`compulsory_code`**: Always `ENG` (Use of English is compulsory for all UTME courses).
6. **`core_elective_codes`**: Pipe-separated (`|`) list of **mandatory fixed** elective subject codes (`0` to `3` codes):
   - If all 3 electives are fixed (e.g., *Medicine and Surgery*: Biology, Chemistry, Physics), put `BIO|CHM|PHY`.
   - If 2 electives are fixed and 1 is a choice (e.g., *Computer Science*: Mathematics and Physics are compulsory, plus 1 other Science/Social Science subject), put `MTH|PHY`.
   - If 1 elective is fixed and 2 are choices (e.g., *Common Law*: Literature in English is compulsory, plus any 2 Arts/Social Science subjects), put `LIT`.
   - If all 3 electives are chosen from a group (e.g., *Sociology* or *Public Administration* in some brochures where 3 Social Science/Arts subjects are picked, though prefer locking the primary core subject like `GOV` or `ECN` where standard), put the mandatory code(s).
7. **`flexible_pick_count`**: Integer (`0`, `1`, `2`, or `3`). MUST equal `3 - (number of codes in core_elective_codes)`:
   - If `core_elective_codes` has 3 codes (`BIO|CHM|PHY`), `flexible_pick_count` is `0`.
   - If `core_elective_codes` has 2 codes (`MTH|PHY`), `flexible_pick_count` is `1`.
   - If `core_elective_codes` has 1 code (`LIT`), `flexible_pick_count` is `2`.
8. **`flexible_slot_label`**:
   - Leave empty (`""`) if `flexible_pick_count` is `0`.
   - Otherwise, write a clear instruction for the student, e.g., `"Choose 1 of Biology, Chemistry, Agricultural Science, Economics, or Geography"` or `"Choose any 2 Arts or Social Science subjects"`.
9. **`flexible_allowed_codes`**:
   - Leave empty (`""`) if `flexible_pick_count` is `0`.
   - Otherwise, pipe-separated (`|`) list of official JAMB-accepted subject codes for the flexible slot (e.g., `CHM|BIO|AGR|ECN|GEO|CMP`). Must NOT repeat `ENG` or any code already in `core_elective_codes`.
10. **`flexible_default_codes`**:
    - Leave empty (`""`) if `flexible_pick_count` is `0`.
    - Otherwise, pipe-separated (`|`) list of the most popular default code(s) from `flexible_allowed_codes`, with exact count equal to `flexible_pick_count` (e.g., `CHM` when `flexible_pick_count` is `1`, or `GOV|CRK` when `flexible_pick_count` is `2`).
11. **`recommended_target_score`**: Realistic competitive UTME target score out of 400 (multiple of 5 between `180` and `320`, e.g., `300` for Medicine, `280` for Law/Nursing, `260` for Computer Science/Engineering, `220` for Agriculture/Education).
12. **`competitive_score_range`**: Display string for the score range (e.g., `290 - 330+`, `260 - 290+`, `200 - 240+`).
13. **`ibass_note`**: Concise 1-sentence official JAMB IBASS brochure remark (including O'Level or special university waiver notes if applicable). Wrap in double quotes (`"..."`) if it contains commas.

---

### 3. EXAMPLE CSV ROWS

```csv
course_id,course_title,faculty,aliases,compulsory_code,core_elective_codes,flexible_pick_count,flexible_slot_label,flexible_allowed_codes,flexible_default_codes,recommended_target_score,competitive_score_range,ibass_note
medicine-and-surgery,Medicine and Surgery,Medical & Health Sciences,mbbs|medicine|doctor|med surg|surgery,ENG,BIO|CHM|PHY,0,"","","",300,290 - 330+,"Requires Use of English, Biology, Chemistry, and Physics. Five O'Level credits including English, Mathematics, Biology, Chemistry, and Physics at one sitting in most federal universities."
computer-science,Computer Science,Sciences & Computing,csc|comp sci|computing|software,ENG,MTH|PHY,1,"Choose 1 additional Science or Social Science subject",CHM|BIO|AGR|ECN|GEO|CMP,CHM,260,250 - 290+,"Requires Use of English, Mathematics, Physics, and one of Biology, Chemistry, Agricultural Science, Economics, Geography, or Computer Studies."
common-law,Common Law / Civil Law,Law,law|llb|legal studies|barrister,ENG,LIT,2,"Choose any 2 Arts or Social Science subjects",GOV|CRK|IRS|HIS|ECN,GOV|CRK,280,270 - 310+,"Requires Use of English, Literature in English, and any two Arts or Social Science subjects."
accounting,Accounting / Accountancy,Management & Commercial,acct|accountancy|chartered accountant|aca,ENG,MTH|ECN,1,"Choose 1 Social Science or Commercial subject",ACC|COM|GOV|GEO,ACC,250,240 - 280+,"Requires Use of English, Mathematics, Economics, and any one of Principles of Accounting, Commerce, Government, or Geography."
```

---

### 4. FACULTY CHECKLIST TO REACH 300+ COURSES

Do NOT stop at 50 or 100 courses. Ensure your output CSV contains **at least 300 distinct courses** across all 9 faculties by covering all standard and specialized programmes in the JAMB IBASS Brochure:

1. **Medical & Health Sciences (25+ courses)**: Medicine and Surgery, Dentistry & Dental Surgery, Pharmacy, Doctor of Pharmacy (Pharm.D), Nursing Science, Medical Laboratory Science, Physiotherapy, Medical Rehabilitation, Radiography & Radiation Science, Optometry, Human Anatomy, Human Physiology, Pharmacology, Public Health, Environmental Health Science, Human Nutrition & Dietetics, Prosthetics & Orthotics, Audiology, Speech Therapy, Biomedical Technology, Dental Technology, Health Information Management, Complementary & Alternative Medicine, Veterinary Medicine, Midwifery, Community Health, Dispensing Opticianry.
2. **Engineering & Technology (55+ courses)**: Civil Engineering, Mechanical Engineering, Electrical Engineering, Electronics Engineering, Electrical & Electronics Engineering, Computer Engineering, Software Engineering, Chemical Engineering, Petroleum Engineering, Petroleum & Gas Engineering, Gas Engineering, Mechatronics Engineering, Aerospace / Aeronautical Engineering, Agricultural & Bio-Resources Engineering, Marine Engineering, Metallurgical & Materials Engineering, Systems Engineering, Biomedical Engineering, Structural Engineering, Production & Industrial Engineering, Automotive Engineering, Telecommunications Engineering, Information & Communication Engineering, Polymer & Textile Engineering, Food Engineering, Water Resources & Environmental Engineering, Mining Engineering, Wood Products Engineering, Petrochemical Engineering, Geotechnical Engineering, Metallurgical Engineering, Naval Architecture, Building Technology, Food Technology, Glass & Ceramic Technology, Printing Technology, Welding & Fabrication Engineering.
3. **Agriculture & Environmental (40+ courses)**: Agricultural Science, Agriculture, Agricultural Economics, Agricultural Extension & Rural Development, Agricultural Economics & Extension, Agronomy, Crop Production & Protection, Crop Science, Soil Science & Land Management, Animal Science, Animal Production & Health, Animal Physiology, Animal Breeding & Genetics, Animal Nutrition, Pasture & Range Management, Fisheries & Aquaculture, Forestry & Wildlife Management, Ecotourism & Wildlife Management, Food Science & Technology, Home Science & Management, Nutrition & Consumer Sciences, Water Resources Management & Agrometeorology, Horticultural Science, Plant Breeding & Seed Technology, Architecture, Estate Management, Quantity Surveying, Urban & Regional Planning, Surveying & Geoinformatics, Industrial Design, Environmental Management, Environmental Protection & Resources Management, Transport Management Technology, Project Management Technology, Maritime Management Technology, Logistics & Supply Chain Technology.
4. **Sciences & Computing (60+ courses)**: Computer Science, Cyber Security, Information Technology, Information Systems, Software Development, Data Science, Artificial Intelligence, Library & Information Science, Mathematics, Pure & Applied Mathematics, Industrial Mathematics, Mathematics with Statistics, Mathematics with Computer Science, Statistics, Actuarial Science, Operations Research, Physics, Pure & Applied Physics, Industrial Physics, Physics with Electronics, Geophysics, Applied Geophysics, Astronomy & Space Science, Chemistry, Industrial Chemistry, Pure & Applied Chemistry, Petroleum Chemistry, Medicinal Chemistry, Polymer Chemistry, Environmental Chemistry, Biochemistry, Biology, Applied Biology, Microbiology, Industrial Microbiology, Biotechnology, Genetics & Biotechnology, Botany, Plant Science & Biotechnology, Zoology, Applied Zoology, Cell Biology & Genetics, Marine Biology, Marine Science & Technology, Parasitology & Entomology, Ecology & Environmental Biology, Conservation Biology, Geology, Earth Sciences, Meteorology & Climate Science, Science Laboratory Technology (SLT), Forensic Science, Brewing Science & Technology.
5. **Social Sciences (35+ courses)**: Economics, Economics & Development Studies, Political Science, Political Science & Public Administration, International Relations, International Studies & Diplomacy, Peace & Conflict Resolution, Mass Communication, Journalism & Media Studies, Broadcasting, Information & Media Studies, Film & Multimedia Studies, Sociology, Anthropology, Sociology & Anthropology, Psychology, Clinical Psychology, Industrial & Organizational Psychology, Criminology & Security Studies, Intelligence & Security Studies, Geography, Geography & Regional Planning, Demography & Social Statistics, Social Work, Public Administration, Local Government & Development Studies, Philosophy & Public Affairs, Polls & Survey Research, Social Justice.
6. **Management & Commercial (35+ courses)**: Accounting / Accountancy, Business Administration, Business Management, Banking and Finance, Finance, Islamic Banking & Finance, Marketing, Insurance, Actuarial Science & Insurance, Risk Management & Insurance, Industrial Relations & Personnel Management, Human Resource Management, Employment Relations & Human Resource Management, Entrepreneurship, Entrepreneurship & Innovation, Cooperative & Rural Development, Cooperative Economics & Management, Taxation, Customs & Excise Management, Office & Information Management, Secretarial Administration, Procurement & Supply Chain Management, Public Relations & Advertising, E-Commerce & Digital Business, Hospitality & Tourism Management, Hotel & Catering Management, Transport & Logistics Management.
7. **Law (10+ courses)**: Common Law, Civil Law, Law (LL.B), Common and Islamic Law (Sharia Law), Islamic / Sharia Law, Private & Islamic Law, Public & International Law, Commercial & Industrial Law, Jurisprudence & International Law, Customary Law.
8. **Arts & Humanities (40+ courses)**: English Language, English & Literary Studies, Literature in English, Theatre Arts, Performing Arts, Dramatic Arts, Theatre & Media Arts, Creative Arts, Visual Arts, Fine & Applied Arts, Music, History, History & International Studies, History & Diplomatic Studies, Diplomatic Studies, Archaeology, Archaeology & Heritage Studies, Philosophy, Religious Studies, Christian Religious Studies, Theology, Islamic Studies, Arabic Studies, Arabic & Islamic Studies, Linguistics, Linguistics & Nigerian Languages, Linguistics & African Languages, Linguistics & Communication Studies, French, Modern European Languages, Hausa, Igbo, Yoruba, Combined Arts, Communication & Language Arts, Translation Studies, Cultural & Media Studies.
9. **Education (55+ courses)**: Education & Biology, Education & Chemistry, Education & Physics, Education & Mathematics, Education & Computer Science, Education & Integrated Science, Education & Agricultural Science, Education & Geography, Education & Economics, Education & Political Science, Education & Social Studies, Education & Accountancy, Business Education, Secretarial Education, Marketing Education, Education & English Language, Education & Literature in English, Education & French, Education & History, Education & Christian Religious Studies, Education & Islamic Studies, Education & Arabic, Education & Fine Art, Education & Music, Education & Hausa, Education & Igbo, Education & Yoruba, Guidance & Counselling, Educational Management, Educational Administration & Planning, Educational Foundations, Curriculum & Instruction, Educational Technology, Adult & Non-Formal Education, Community Development & Adult Education, Early Childhood Education, Primary Education Studies, Nursery & Primary Education, Special Needs Education, Human Kinetics & Health Education, Physical & Health Education, Health Education, Home Economics & Education, Technical & Vocational Education, Automobile Technology Education, Building Technology Education, Electrical/Electronics Technology Education, Metalwork Technology Education, Woodwork Technology Education, Library & Information Science (Education), Environmental Education, Science Education, Arts Education, Social Science Education.

---

### 5. VALIDATION CHECKS BEFORE YOU EXPORT THE CSV

Before generating the downloadable file, verify that:
1. Total data rows >= **300** (excluding header).
2. Every row has **exactly 13 columns** (properly escaping any commas inside text fields with double quotes `"..."`).
3. Every single subject code in `compulsory_code`, `core_elective_codes`, `flexible_allowed_codes`, and `flexible_default_codes` is one of the 25 valid codes (`ENG`, `MTH`, `PHY`, `CHM`, `BIO`, `AGR`, `GEO`, `CMP`, `PHE`, `HEC`, `ECN`, `GOV`, `COM`, `ACC`, `LIT`, `CRK`, `IRS`, `HIS`, `ARB`, `ART`, `FRN`, `HAU`, `IGB`, `MUS`, `YOR`).
4. For every row, `count(core_elective_codes) + flexible_pick_count == 3` and `count(flexible_default_codes) == flexible_pick_count`.
5. Output the result as a **downloadable `.csv` file (`jamb_courses_combinations.csv`)** using your Python/code interpreter tool if available, or as raw downloadable CSV blocks.
```
