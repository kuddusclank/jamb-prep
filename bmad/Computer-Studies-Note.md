# JAMB Computer Studies — Comprehensive Study Note for Candidates (Jambites)

**Subject Code:** `CMP`  
**Total Questions in UTME:** 40 Questions  
**Time Target:** 25 – 27 Minutes  
**Maximum Scaled Score:** 100 Marks  
**Authoritative Reference:** Official JAMB IBASS Syllabus for Computer Studies  

---

## Overview & How JAMB Tests Computer Studies

In the UTME, Computer Studies is tested via **40 multiple-choice questions** grouped into five main domains:
1. **Evolution & Generations of Computers (~6 Questions):** Historical calculating devices (Abacus, Napier's Bones, Pascaline, Babbage's Engines, Hollerith machine), the 5 computer generations and their defining switching technologies (Vacuum tubes, Transistors, ICs, Microprocessors, AI).
2. **Computer Hardware & Architecture (~10 Questions):** Central Processing Unit (ALU, CU, Registers), system buses, Von Neumann architecture, primary memory (RAM vs. ROM, cache), secondary storage media (magnetic, optical, solid-state), and input/output peripherals.
3. **Data Representation & Logic Gates (~8 Questions):** Number systems conversions (Binary, Octal, Decimal, Hexadecimal), storage measurement units (bits, bytes, KB, MB, GB, TB), character coding (ASCII, EBCDIC, Unicode), and logic gate truth tables (AND, OR, NOT, NAND, NOR, XOR).
4. **Software, Programming & Algorithms (~10 Questions):** System software (Operating systems, utilities, translators: compiler vs. interpreter), application software, flowchart symbols, programming languages, and relational database fundamentals (tables, records, keys).
5. **Computer Networks, Internet & Cybersecurity (~6 Questions):** Network topologies (Star, Bus, Ring, Mesh), network devices (switches, routers, modems), networking protocols (TCP/IP, HTTP, DNS), malware types, cybercrimes, and security safeguards.

> [!IMPORTANT]
> **Key Exam Calculations in Computer Studies:**
> - Storage conversion formulas: $1\text{ Byte} = 8\text{ bits}$; $1\text{ Kilobyte (KB)} = 1,024\text{ bytes} = 2^{10}\text{ bytes}$; $1\text{ Megabyte (MB)} = 1,024\text{ KB} = 2^{20}\text{ bytes}$; $1\text{ Gigabyte (GB)} = 1,024\text{ MB} = 2^{30}\text{ bytes}$.
> - Binary to Hexadecimal grouping: Always group binary digits in sets of **4 bits** starting from the right (least significant bit). E.g., $1111_2 = \text{F}_{16} = 15_{10}$.
> - Universal Logic Gates: **NAND** and **NOR** gates are "universal gates" because any other logic gate (AND, OR, NOT) can be constructed solely using combinations of NAND or NOR gates.

---

# SECTION 1: EVOLUTION & GENERATIONS OF COMPUTERS

## 1. Early Calculating Devices
- **Abacus (c. 500 BC):** First mechanical calculation device using beads strung on parallel wires; performed basic addition and subtraction.
- **Napier's Bones (John Napier, 1617):** Set of numbered rods carved from bone or wood used for multiplication and division; pioneered the concept of logarithms.
- **Pascaline (Blaise Pascal, 1642):** First mechanical adding machine; operated using interlocking toothed wheels and gears; capable of automated carry-over operations.
- **Leibniz Stepped Reckoner (Gottfried Leibniz, 1673):** Used a stepped cylinder gear to perform all four arithmetic operations ($+, -, \times, \div$) and extract square roots mechanically.
- **Jacquard's Loom (Joseph Marie Jacquard, 1801):** Automated weaving loom that used **punched cards** to control fabric patterns; introduced the concept of coded program storage.
- **Charles Babbage (1791–1871) — "Father of the Computer":**
  - *Difference Engine (1822):* Steam-driven mechanical calculator designed to tabulate polynomial mathematical and astronomical tables.
  - *Analytical Engine (1837):* The first general-purpose, fully programmable mechanical computer; featured the four fundamental components of modern computers: the **Mill** (CPU), the **Store** (Memory), the **Reader** (Input via punched cards), and the **Printer** (Output).
- **Lady Ada Lovelace (Augusta Ada King):** World's **first computer programmer**; wrote algorithm sequences for Babbage's Analytical Engine; introduced the concept of loops and subroutines.
- **Herman Hollerith (1890):** Developed the electric punched-card tabulating machine to process the 1890 US Census; founded the Tabulating Machine Company, which later became **IBM (International Business Machines)** in 1924.

---

## 2. The Five Generations of Electronic Computers
| Generation | Period | Defining Technology | Primary Memory | Storage Media | Programming Language | Characteristics & Milestones |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **First Generation** | 1940 – 1956 | **Vacuum Tubes (Thermionic Valves)** | Magnetic Drums / Delay Lines | Punched Cards, Magnetic Tape | **Machine Language** (Binary 0 and 1) | Bulky, consumed massive electricity, generated enormous heat, slow, unreliable. Examples: **ENIAC, EDVAC, UNIVAC I**. |
| **Second Generation** | 1956 – 1963 | **Transistors** (Bipolar Junction Transistors) | Magnetic Core Memory | Magnetic Tapes and Magnetic Disks | **Assembly Language** & Early High-Level (FORTRAN, COBOL) | Smaller, faster, more energy-efficient, produced less heat. Examples: **IBM 1401, CDC 1604**. |
| **Third Generation** | 1964 – 1971 | **Integrated Circuits (ICs)** (Small & Medium Scale Integration - SSI/MSI) | Semiconductor RAM/ROM | High-capacity Magnetic Disks | High-Level Languages (BASIC, Pascal, C) | Introduced monitors, keyboards, operating systems, and time-sharing. Examples: **IBM System/360, PDP-8**. |
| **Fourth Generation** | 1971 – Present | **Microprocessors** (VLSI & ULSI: Very Large Scale Integration) | Semiconductor SRAM & DRAM | Hard Disks, Floppy Disks, Optical Discs, SSDs | 4th Generation Languages (SQL), Object-Oriented (C++, Java, Python) | Microcomputers (PCs), Laptops, Graphical User Interface (GUI), mouse, Internet, LAN. Example: Intel 4004 (first microprocessor), Apple II, IBM PC. |
| **Fifth Generation** | Present & Future | **Ultra-Large-Scale Integration (ULSI)** & **Artificial Intelligence (AI)** | Optical & Quantum Memory | High-density Solid-State Drives, Cloud Storage | Natural Language & Neural Networks | Parallel processing, machine learning, natural language voice recognition, robotics, quantum computing. |

---

# SECTION 2: COMPUTER HARDWARE & ARCHITECTURE

## 3. Central Processing Unit (CPU) and Memory
- **The Von Neumann Architecture:** The fundamental blueprint of modern computers; characterized by a single shared memory containing both program instructions and data, connected to a processing unit that executes instructions sequentially.
- **Components of the CPU:**
  1. **Arithmetic and Logic Unit (ALU):** Performs all basic arithmetic operations (addition, subtraction, multiplication, division) and logical comparisons ($\text{AND, OR, NOT, } <, >, =$).
  2. **Control Unit (CU):** The coordinator/supervisor of the entire computer; fetches instructions from memory, decodes them, and coordinates the execution of operations by sending timing and control signals (**Fetch-Decode-Execute Cycle**).
  3. **Registers:** Ultra-fast, temporary internal memory storage locations inside the CPU:
     - **Program Counter (PC):** Holds the memory address of the **next instruction** to be fetched and executed.
     - **Memory Address Register (MAR):** Holds the memory address currently being read from or written to.
     - **Memory Data / Buffer Register (MDR / MBR):** Holds the actual data or instruction fetched from or to be stored into memory.
     - **Current Instruction Register (CIR):** Holds the instruction currently being decoded and executed.
     - **Accumulator (ACC):** Temporarily stores the intermediate results of ALU calculations.
- **System Buses:**
  - *Data Bus:* Bi-directional bus carrying actual data and instructions between CPU, memory, and I/O devices (width determines system word size: 32-bit, 64-bit).
  - *Address Bus:* **Uni-directional** bus carrying memory addresses from the CPU to RAM (bus width determines maximum addressable memory capacity: a 32-bit address bus can access $2^{32} = 4\text{ GB}$ of RAM).
  - *Control Bus:* Bi-directional bus transmitting timing, clock pulses, interrupt requests, and command signals (Read/Write).
- **Primary vs. Secondary Storage:**
  - *Primary Storage (Internal Memory):* Directly accessible by the CPU via buses:
    - **RAM (Random Access Memory):** **Volatile** (loses all content when power is turned off); read-and-write memory holding active OS processes, open applications, and current data.
    - **ROM (Read Only Memory):** **Non-volatile** (retains data permanently without power); holds firmware instructions needed to start the computer (**BIOS / Bootstrapping program**).
    - **Cache Memory:** Extremely fast SRAM located on or adjacent to the CPU chip, storing frequently used instructions to eliminate CPU idle wait times for slower RAM.
  - *Secondary Storage (Auxiliary Memory):* Non-volatile, high-capacity, permanent storage:
    - Magnetic media: Hard Disk Drives (HDD), Magnetic Tape.
    - Optical media: CD-ROM ($700\text{ MB}$), DVD ($4.7\text{ GB}$ single-layer), Blu-ray Disc ($25\text{ GB}$ single-layer). Read/written using laser beams.
    - Solid-State media: SSDs, USB Flash Drives, SD Cards. Use non-volatile **NAND flash memory**, have no moving mechanical parts, consume less power, and operate significantly faster than magnetic HDDs.

---

# SECTION 3: DATA REPRESENTATION & LOGIC GATES

## 4. Number Systems & Binary Conversions
- **Positional Number Systems:**
  - *Binary (Base 2):* Digits $0, 1$.
  - *Octal (Base 8):* Digits $0, 1, 2, 3, 4, 5, 6, 7$.
  - *Decimal (Base 10):* Digits $0, 1, 2, 3, 4, 5, 6, 7, 8, 9$.
  - *Hexadecimal (Base 16):* Digits $0, 1, 2, 3, 4, 5, 6, 7, 8, 9$ and letters $\text{A}(10), \text{B}(11), \text{C}(12), \text{D}(13), \text{E}(14), \text{F}(15)$.
- **Conversions:**
  - *Binary to Decimal:* Multiply each bit by $2^n$ from right to left ($n = 0, 1, 2 \dots$).
    $$10110_2 = (1 \times 2^4) + (0 \times 2^3) + (1 \times 2^2) + (1 \times 2^1) + (0 \times 2^0) = 16 + 0 + 4 + 2 + 0 = 22_{10}$$
  - *Decimal to Binary:* Repeated division by 2, recording remainders from bottom to top.
  - *Binary to Hexadecimal:* Group bits into blocks of **4 bits** starting from the right:
    $$11010111_2 \to \underbrace{1101}_{\text{D}} \ \underbrace{0111}_{7} = \mathbf{D7_{16}}$$
- **Units of Data Storage:**
  - $1\text{ Bit} = \text{Binary digit } (0 \text{ or } 1)$.
  - $1\text{ Nibble} = 4\text{ bits}$.
  - $1\text{ Byte} = 8\text{ bits} = 1\text{ character}$.
  - $1\text{ Kilobyte (KB)} = 1,024\text{ Bytes} = 2^{10}\text{ Bytes}$.
  - $1\text{ Megabyte (MB)} = 1,024\text{ KB} = 2^{20}\text{ Bytes}$.
  - $1\text{ Gigabyte (GB)} = 1,024\text{ MB} = 2^{30}\text{ Bytes}$.
  - $1\text{ Terabyte (TB)} = 1,024\text{ GB} = 2^{40}\text{ Bytes}$.
- **Character Encoding Standards:**
  - **ASCII (American Standard Code for Information Interchange):** 7-bit code representing $128$ characters ($0-127$). Extended ASCII uses 8 bits ($256$ characters).
  - **Unicode:** Universal 16-bit or 32-bit encoding standard capable of representing characters from all modern and historic world languages.

---

## 5. Logic Gates and Truth Tables
- **Standard Logic Gates:**
  1. **AND Gate ($Y = A \cdot B$):** Output is $1$ **only if ALL inputs are $1$**.
  2. **OR Gate ($Y = A + B$):** Output is $1$ if **at least one input is $1$**.
  3. **NOT Gate / Inverter ($Y = \bar{A}$):** Inverts the input; output is $1$ if input is $0$, and vice versa.
  4. **NAND Gate ($Y = \overline{A \cdot B}$):** Inverted AND gate; output is $0$ **only if all inputs are $1$**. (Universal Gate).
  5. **NOR Gate ($Y = \overline{A + B}$):** Inverted OR gate; output is $1$ **only if all inputs are $0$**. (Universal Gate).
  6. **XOR Gate ($Y = A \oplus B = \bar{A}B + A\bar{B}$):** Exclusive OR; output is $1$ if the inputs are **different** ($0,1$ or $1,0$); output is $0$ if inputs are identical ($0,0$ or $1,1$).

---

# SECTION 4: SOFTWARE, PROGRAMMING & DATABASES

## 6. Software Classification & Operating Systems
- **System Software:** Controls the computer hardware and provides a platform for application software:
  - *Operating System (OS):* Master control program managing hardware resources, memory, processor scheduling, file systems, and user interfaces (e.g., Windows, macOS, Linux, Android, iOS).
  - *Language Translators:*
    - **Assembler:** Translates Assembly language mnemonics into machine code.
    - **Compiler:** Translates the **entire high-level source code program** into machine code object files at once before execution (produces fast standalone executable files; reports all errors together). Examples: C, C++, Fortran.
    - **Interpreter:** Translates and executes high-level source code **line by line** (halts execution immediately when an error is encountered; slower execution; requires interpreter during runtime). Examples: Python, JavaScript.
  - *Utility Programs:* Housekeeping programs (Antivirus, Disk Defragmenter, File Compression/WinZip, Backup utilities).
- **Application Software:** Programs designed to assist users in performing specific end-user tasks: Word processors (MS Word), Spreadsheets (MS Excel), Database Management Systems (MS Access, Oracle), Graphics software (CorelDraw, Photoshop).

---

## 7. Algorithms, Flowcharts, and Databases
- **Standard Flowchart Symbols:**
  - *Oval / Rounded Rectangle:* **Terminator** (Start or Stop of an algorithm).
  - *Parallelogram:* **Input / Output** operation (e.g., "Read A", "Print Sum").
  - *Rectangle:* **Process** (Calculation or data manipulation, e.g., "$\text{Sum} = A + B$").
  - *Diamond:* **Decision / Branching** condition (e.g., "Is $A > B$?", produces Yes/No branches).
  - *Flowline (Arrow):* Indicates sequence and direction of execution.
  - *Small Circle:* **Connector** (connects disparate flow lines on the same page).
- **Relational Database Fundamentals (RDBMS):**
  - *Table (Relation):* Structured grid composed of columns and rows storing related data.
  - *Field (Attribute / Column):* A single category of data (e.g., `FirstName`, `Age`).
  - *Record (Tuple / Row):* A complete collection of related fields describing one specific entity (e.g., one student's complete profile).
  - *Primary Key:* A field (or combination of fields) that **uniquely identifies** each record in a database table (e.g., `JAMB_Registration_Number`); cannot contain duplicate or null values.
  - *Foreign Key:* A primary key from one table placed into another table to establish an active relationship between both tables.

---

# SECTION 5: NETWORKING, THE INTERNET & CYBERSECURITY

## 8. Network Topologies, Devices, and Protocols
- **Network Classifications by Geographic Scope:**
  - *PAN (Personal Area Network):* Within $10\text{ meters}$ (Bluetooth, Zigbee).
  - *LAN (Local Area Network):* Single room, office building, or school campus.
  - *MAN (Metropolitan Area Network):* Covers an entire city or metropolitan district.
  - *WAN (Wide Area Network):* Spans broad national or global distances (e.g., the Internet).
- **Network Physical Topologies:**
  - *Star Topology:* Every computer is connected individually to a central hub or switch via dedicated cables. If one cable breaks, only that node fails; if the central switch fails, the entire network collapses. Most widely used modern topology.
  - *Bus Topology:* All devices are connected sequentially to a single central transmission cable (**backbone**) with **terminators** at both ends. Cheap; difficult to troubleshoot; a cable break halts all network communication.
  - *Ring Topology:* Each device is connected in a continuous circular loop; tokens pass unidirectionally; a single node failure breaks the loop.
  - *Mesh Topology:* Every device is interconnected directly to every other device; provides maximum redundancy and fault tolerance; highly expensive.
- **Essential Network Hardware:**
  - *Switch:* Intelligent central device that forwards data packets **strictly to the specific destination port** based on the hardware **MAC Address**.
  - *Router:* Connects two or more disparate networks (e.g., home LAN to the global Internet) and routes data packets along the fastest path using **IP Addresses**.
  - *Modem (Modulator-Demodulator):* Converts digital signals from computers into analog signals for telephone lines, and vice versa.
- **Key Internet Protocols:**
  - **TCP/IP:** Fundamental communications protocol suite of the Internet.
  - **HTTP / HTTPS:** Hypertext Transfer Protocol (HTTPS adds SSL/TLS encryption on Port 443).
  - **FTP (File Transfer Protocol):** Uploading and downloading files between client and server.
  - **SMTP (Simple Mail Transfer Protocol):** Sending outgoing emails from client to server.
  - **POP3 / IMAP:** Retrieving incoming emails from a mail server.
  - **DNS (Domain Name System):** Resolves human-readable domain names (e.g., `jamb.gov.ng`) into machine-readable numerical IP addresses.

---

## 9. Cybersecurity, Threats, and Ethical Safeguards
- **Types of Malicious Software (Malware):**
  - *Virus:* Self-replicating malicious code that attaches itself to legitimate executable host files or documents; spreads when infected files are opened.
  - *Worm:* Standalone malicious program that replicates across computer networks **without needing a host file** or human intervention, consuming network bandwidth.
  - *Trojan Horse:* Malicious software disguised as attractive, legitimate software (e.g., a free game); once installed, it opens a backdoor for unauthorized access.
  - *Ransomware:* Encrypts the victim's files and demands financial payment (usually cryptocurrency) for the decryption key.
  - *Spyware / Keylogger:* Secretly monitors user behavior, keystrokes, and passwords and transmits them to cybercriminals.
- **Cybercrimes & Defensive Controls:**
  - *Phishing:* Deceptive emails, websites, or SMS messages designed to fraudulently trick users into revealing sensitive credentials, passwords, or credit card details.
  - *Firewall:* Hardware or software barrier monitoring and filtering incoming and outgoing network traffic based on predetermined security rules.
  - *Encryption:* Transforming plaintext data into unreadable ciphertext using cryptographic keys.

---

# SECTION 6: 10 GOLDEN STRATEGIES FOR JAMB COMPUTER STUDIES

1. **Universal Logic Gates:** **NAND** and **NOR** gates are universally configurable—you can create AND, OR, and NOT gates using only NAND or NOR gates.
2. **First vs Second Generation Technologies:** First generation used **Vacuum Tubes** and machine language; Second generation used **Transistors** and assembly language.
3. **Ada Lovelace is the First Programmer:** Charles Babbage invented the Analytical Engine, but **Ada Lovelace** wrote the first computer programs for it.
4. **Primary Key Definition:** A **Primary Key** must be completely unique and cannot contain empty (null) values.
5. **Switch vs Hub Intelligence:** A **Hub** broadcasts incoming packets to every connected port (causing collisions); a **Switch** forwards packets solely to the designated destination port.
6. **Compiler vs Interpreter:** A **Compiler** translates the whole program into object code at once; an **Interpreter** executes instructions line by line.
7. **Storage Conversion Multiplier:** Always remember the computer storage multiplier is **$1,024$ ($2^{10}$)**, NOT $1,000$.
8. **Program Counter (PC) Role:** The **Program Counter** holds the memory address of the *next* instruction to be fetched, not the current one.
9. **Star Topology Fault Tolerance:** In a Star topology, if an individual workstation cable breaks, only that single workstation goes down; the rest of the network continues working normally.
10. **HTTPS Port Number:** Standard HTTP runs on Port 80; secure encrypted **HTTPS** runs on Port 443.
