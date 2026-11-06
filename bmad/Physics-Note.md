# JAMB Physics — Comprehensive Study Note for Candidates (Jambites)

**Subject Code:** `PHY`  
**Total Questions in UTME:** 40 Questions  
**Time Target:** 25 – 27 Minutes  
**Maximum Scaled Score:** 100 Marks  
**Authoritative Reference:** Official JAMB IBASS Syllabus for Physics  

---

## Overview & How JAMB Tests Physics

In the UTME, Physics is tested via **40 multiple-choice questions** spanning five primary branches:
1. **Mechanics & Properties of Matter (~14 Questions):** Units and dimensions, vectors, kinematics, projectiles, Newton's laws, work/energy/power, machines, circular motion, gravitation, equilibrium, elasticity, and fluids.
2. **Thermal Physics (~6 Questions):** Thermometry, thermal expansion, calorimetry, gas laws, kinetic theory, and modes of heat transfer.
3. **Waves, Sound, and Optics (~8 Questions):** Wave properties, sound phenomena, acoustics, resonance in pipes/strings, reflection and refraction at plane/curved surfaces, lenses, optical instruments, and eye defects.
4. **Electricity and Magnetism (~8 Questions):** Electrostatics, capacitors, current electricity, Ohm's law, electrical energy/power, magnetic fields, electromagnetic induction, transformers, and AC circuits.
5. **Modern, Atomic, and Nuclear Physics (~4 Questions):** Photoelectric effect, wave-particle duality, X-rays, energy levels, radioactivity, nuclear energy, and elementary semiconductor diodes.

> [!IMPORTANT]
> **Exam Strategy for Numerical Problems:** JAMB calculations are designed to be solved without high-powered calculators. Always look for standard physical constants provided on the question paper (e.g., $g = 10\text{ m/s}^2$, $c = 3 \times 10^8\text{ m/s}$, $h = 6.63 \times 10^{-34}\text{ J}\cdot\text{s}$, $e = 1.6 \times 10^{-19}\text{ C}$). Round numbers reasonably and maintain strict attention to SI units (convert $\text{cm}$ to $\text{m}$, $\text{g}$ to $\text{kg}$, and minutes/hours to seconds before plugging into equations).

---

# SECTION 1: MECHANICS AND PROPERTIES OF MATTER

## 1. Units, Dimensions, and Vectors
- **Fundamental Quantities & Units:** Length ($\text{m}$), Mass ($\text{kg}$), Time ($\text{s}$), Electric Current ($\text{A}$), Thermodynamic Temperature ($\text{K}$), Luminous Intensity ($\text{cd}$), Amount of Substance ($\text{mol}$).
- **Dimensional Analysis:**
  - Velocity: $[v] = \text{L}\text{T}^{-1}$
  - Acceleration: $[a] = \text{L}\text{T}^{-2}$
  - Force: $[F] = [m][a] = \text{M}\text{L}\text{T}^{-2}$
  - Work / Energy: $[W] = [F][d] = \text{M}\text{L}^2\text{T}^{-2}$
  - Power: $[P] = \frac{[W]}{[t]} = \text{M}\text{L}^2\text{T}^{-3}$
  - Pressure / Stress: $\frac{[F]}{[A]} = \text{M}\text{L}^{-1}\text{T}^{-2}$
  - Universal Gravitational Constant ($G$): From $F = \frac{Gm_1 m_2}{r^2} \implies [G] = \text{M}^{-1}\text{L}^3\text{T}^{-2}$
- **Vectors vs. Scalars:**
  - *Scalars* (magnitude only): Mass, distance, speed, time, work, energy, temperature, electric potential.
  - *Vectors* (magnitude and direction): Displacement, velocity, acceleration, force, momentum, impulse, electric/magnetic field intensity.
- **Resultant of Two Vectors:**
  - At angle $\theta$: $R = \sqrt{A^2 + B^2 + 2AB\cos\theta}$
  - Perpendicular ($\theta = 90^\circ$): $R = \sqrt{A^2 + B^2}$, $\tan\alpha = \frac{B}{A}$

---

## 2. Linear Kinematics & Projectile Motion
- **Equations of Uniformly Accelerated Linear Motion:**
  1. $v = u + at$
  2. $s = ut + \frac{1}{2}at^2$
  3. $v^2 = u^2 + 2as$
  4. $s = \frac{(u + v)}{2}t$
  *(Under gravity, replace $a$ with $+g$ for downward motion and $-g$ for upward motion; take $g = 10\text{ m/s}^2$).*
- **Motion Graphs:**
  - *Displacement–Time graph:* Slope = Velocity.
  - *Velocity–Time graph:* Slope = Acceleration; Area under curve = Total distance / displacement.
- **Projectile Motion (Launch angle $\theta$ to horizontal):**
  - Horizontal velocity: $u_x = u\cos\theta$ (constant throughout flight, $a_x = 0$).
  - Initial vertical velocity: $u_y = u\sin\theta$ (subject to downward gravity $g$).
  - **Time of Flight ($T$):**
    $$T = \frac{2u\sin\theta}{g}$$
  - **Maximum Height ($H$):**
    $$H = \frac{u^2\sin^2\theta}{2g}$$
  - **Horizontal Range ($R$):**
    $$R = \frac{u^2\sin 2\theta}{g}$$
  - *Maximum Range Condition:* $\theta = 45^\circ \implies R_{max} = \frac{u^2}{g}$.
  - *Complementary Angles:* Equal ranges are attained at launch angles $\theta$ and $(90^\circ - \theta)$ (e.g., $30^\circ$ and $60^\circ$).

---

## 3. Newton's Laws of Motion, Momentum, and Impulse
- **Newton's First Law (Inertia):** A body remains at rest or in uniform motion along a straight line unless acted upon by an external net force. Measure of inertia = Mass.
- **Newton's Second Law:** $F = \frac{\Delta p}{\Delta t} = ma$.
- **Newton's Third Law:** For every action, there is an equal and opposite reaction ($F_{AB} = -F_{BA}$).
- **Impulse ($I$) and Linear Momentum ($p$):**
  - Momentum: $p = mv$ ($\text{kg}\cdot\text{m/s}$).
  - Impulse: $I = F \cdot \Delta t = \Delta p = m(v - u)$ ($\text{N}\cdot\text{s}$ or $\text{kg}\cdot\text{m/s}$).
- **Law of Conservation of Linear Momentum:**
  $$m_1 u_1 + m_2 u_2 = m_1 v_1 + m_2 v_2$$
  - *Elastic Collision:* Both momentum and kinetic energy are conserved ($e = 1$).
  - *Inelastic Collision:* Momentum is conserved, but kinetic energy is lost as heat/sound. If bodies coalesce (stick together):
    $$m_1 u_1 + m_2 u_2 = (m_1 + m_2)V$$

---

## 4. Work, Energy, Power, and Simple Machines
- **Work Done:** $W = F \cdot d \cos\theta$ (Joules, $\text{J}$).
- **Kinetic Energy:** $E_k = \frac{1}{2}mv^2 = \frac{p^2}{2m}$.
- **Gravitational Potential Energy:** $E_p = mgh$.
- **Conservation of Mechanical Energy:** In an isolated system, $E_k + E_p = \text{constant}$.
- **Power:** $P = \frac{W}{t} = F \cdot v$ (Watts, $\text{W}$).
- **Simple Machines:**
  - Mechanical Advantage: $\text{MA} = \frac{\text{Load}}{\text{Effort}}$
  - Velocity Ratio: $\text{VR} = \frac{\text{Distance moved by Effort}}{\text{Distance moved by Load}}$
  - Efficiency ($\eta$):
    $$\eta = \frac{\text{Work Output}}{\text{Work Input}} \times 100\% = \frac{\text{MA}}{\text{VR}} \times 100\%$$
  - *Key Machine VR Formulas:*
    - *Inclined Plane:* $\text{VR} = \frac{1}{\sin\theta} = \frac{\text{Length of plane}}{\text{Height}}$.
    - *Wheel and Axle:* $\text{VR} = \frac{R}{r} = \frac{\text{Radius of wheel}}{\text{Radius of axle}}$.
    - *Hydraulic Press:* $\text{VR} = \frac{R^2}{r^2} = \frac{D^2}{d^2}$.
    - *Pulleys:* $\text{VR} =$ number of pulleys in a block and tackle system.
    - *Screw Jack:* $\text{VR} = \frac{2\pi l}{p}$ ($l =$ handle length, $p =$ pitch).

---

## 5. Circular Motion and Gravitation
- **Uniform Circular Motion:** Constant speed, changing velocity due to continuous direction change.
  - Angular velocity: $\omega = \frac{\theta}{t} = \frac{2\pi}{T} = 2\pi f$.
  - Linear vs. Angular: $v = \omega r$.
  - Centripetal acceleration: $a_c = \frac{v^2}{r} = \omega^2 r$.
  - Centripetal force: $F_c = \frac{mv^2}{r} = m\omega^2 r$.
- **Newton's Law of Universal Gravitation:**
  $$F = \frac{G m_1 m_2}{r^2} \quad (G = 6.67 \times 10^{-11}\text{ N}\cdot\text{m}^2/\text{kg}^2)$$
  - Acceleration due to gravity on planet surface: $g = \frac{GM}{R^2}$.
  - Variation of $g$ with height $h$: $g_h = g\left(\frac{R}{R + h}\right)^2$.
  - Orbital speed of satellite: $v = \sqrt{\frac{GM}{r}}$.
  - **Escape Velocity ($v_e$):**
    $$v_e = \sqrt{\frac{2GM}{R}} = \sqrt{2gR} \approx 11.2\text{ km/s on Earth}$$
  - **Kepler's Third Law:** $T^2 \propto r^3$.

---

## 6. Equilibrium and Elasticity
- **Conditions for Static Equilibrium:**
  1. $\sum F_x = 0$ and $\sum F_y = 0$ (Translational equilibrium).
  2. $\sum \tau = 0$ (Rotational equilibrium: clockwise moments = counterclockwise moments).
- **Hooke's Law:** Force is proportional to extension up to the elastic limit:
  $$F = ke$$
  - Elastic Potential Energy:
    $$E = \frac{1}{2}Fe = \frac{1}{2}ke^2$$
  - Stress: $\sigma = \frac{F}{A}$ ($\text{N/m}^2$).
  - Strain: $\varepsilon = \frac{e}{L}$ (dimensionless).
  - Young's Modulus:
    $$Y = \frac{\text{Tensile Stress}}{\text{Tensile Strain}} = \frac{FL}{Ae}$$

---

## 7. Fluids and Properties of Matter
- **Density ($\rho$):** $\rho = \frac{m}{V}$ ($\text{kg/m}^3$).
- **Pressure in Liquids:** $P = \rho g h$. Total pressure $= P_{atm} + \rho gh$.
- **Archimedes' Principle:** When a body is wholly or partially immersed in a fluid, it experiences an upthrust equal to the weight of the fluid displaced:
  $$\text{Upthrust } U = \text{Weight in air} - \text{Weight in fluid} = V_{immersed} \cdot \rho_{fluid} \cdot g$$
- **Law of Flotation:** A floating body displaces its own weight of the fluid in which it floats.
- **Surface Tension ($\gamma$):** Force per unit length along the surface: $\gamma = \frac{F}{L}$ ($\text{N/m}$).
  - Causes liquid droplets to become spherical (minimum surface area).
- **Viscosity:** Internal fluid friction. Stokes' Law for a sphere of radius $r$ moving at terminal velocity $v_t$:
  $$F = 6\pi \eta r v_t$$

---

# SECTION 2: THERMAL PHYSICS AND PROPERTIES OF MATTER

## 8. Thermometry and Thermal Expansion
- **Thermometric Properties:** Resistance (platinum thermometer), volume of liquid (mercury/alcohol), pressure of gas at constant volume.
- **Temperature Scale Conversion:**
  $$\frac{\theta - 0}{100 - 0} = \frac{X_\theta - X_0}{X_{100} - X_0} \quad \text{and} \quad T(\text{K}) = \theta(^\circ\text{C}) + 273.15$$
- **Thermal Expansivities:**
  - Linear expansivity: $\alpha = \frac{\Delta L}{L_1 \Delta\theta}$ ($\text{K}^{-1}$ or $^\circ\text{C}^{-1}$).
  - Area (superficial) expansivity: $\beta \approx 2\alpha$.
  - Volume (cubic) expansivity: $\gamma \approx 3\alpha$.
  - Real vs. Apparent expansion of liquids: $\gamma_{real} = \gamma_{apparent} + \gamma_{vessel}$.
- **Anomalous Expansion of Water:** Between $0^\circ\text{C}$ and $4^\circ\text{C}$, water contracts on heating and expands on cooling. Maximum density occurs at $4^\circ\text{C}$ (enabling aquatic life survival under frozen lakes).

---

## 9. Heat Capacity and Change of State
- **Heat Quantities:**
  - Heat Capacity: $C = \frac{Q}{\Delta\theta}$ ($\text{J/K}$).
  - Specific Heat Capacity ($c$): $Q = mc\Delta\theta$ ($\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$).
  - Specific Latent Heat of Fusion ($l_f$): $Q = m l_f$ (solid $\to$ liquid at melting point).
  - Specific Latent Heat of Vaporization ($l_v$): $Q = m l_v$ (liquid $\to$ vapor at boiling point).
- **Method of Mixtures (Thermal Equilibrium):**
  $$\text{Heat Lost by Hot Body} = \text{Heat Gained by Cold Body} + \text{Heat Gained by Calorimeter}$$
- **Evaporation vs. Boiling:**
  - Evaporation occurs at all temperatures and at the surface only.
  - Boiling occurs throughout the liquid mass at a specific temperature where saturated vapor pressure (SVP) equals atmospheric pressure.
  - Higher altitude $\implies$ lower atmospheric pressure $\implies$ water boils below $100^\circ\text{C}$.

---

## 10. Gas Laws and Heat Transfer
- **Boyle's Law:** $P_1 V_1 = P_2 V_2$ ($T =$ constant, isothermal).
- **Charles's Law:** $\frac{V_1}{T_1} = \frac{V_2}{T_2}$ ($P =$ constant, isobaric; $T$ must be in Kelvin).
- **Pressure (Gay-Lussac's) Law:** $\frac{P_1}{T_1} = \frac{P_2}{T_2}$ ($V =$ constant).
- **General Gas Equation:**
  $$\frac{P_1 V_1}{T_1} = \frac{P_2 V_2}{T_2} = nR$$
- **Modes of Heat Transfer:**
  1. *Conduction:* Through material medium via molecular collisions and free electrons (solids).
  2. *Convection:* Bulk fluid movement due to density differences (liquids and gases).
  3. *Radiation:* Electromagnetic waves without requiring a material medium (can travel through a vacuum).
  - *Stefan-Boltzmann Law:* Total radiated power $E \propto T^4$.
  - *Good absorber = Good radiator:* Dull black surfaces absorb and radiate heat best; polished shiny surfaces reflect heat.

---

# SECTION 3: WAVES, SOUND, AND OPTICS

## 11. Wave Fundamentals
- **Wave Types:**
  - *Transverse:* Particles vibrate perpendicular to direction of wave propagation (e.g., light, radio, water waves). Can be polarized.
  - *Longitudinal:* Particles vibrate parallel to direction of wave propagation (e.g., sound waves). Consists of compressions and rarefactions. Cannot be polarized.
- **Wave Parameters & Equation:**
  - Velocity: $v = f\lambda = \frac{\lambda}{T}$.
  - General Wave Equation:
    $$y = A\sin\left(\frac{2\pi}{\lambda}(vt \pm x)\right) = A\sin(\omega t \pm kx)$$
    *(Use $-$ for wave travelling in positive $x$-direction, $+$ for negative $x$-direction).*
  - Phase difference: $\phi = \frac{2\pi x}{\lambda}$.
- **Wave Behaviors:**
  - *Reflection:* Angle of incidence $i =$ angle of reflection $r$.
  - *Refraction:* Bending when passing into a different medium; frequency $f$ remains unchanged, speed $v$ and wavelength $\lambda$ change ($v_1/\lambda_1 = v_2/\lambda_2$).
  - *Diffraction:* Bending around obstacles/slits (prominent when obstacle size $\approx \lambda$).
  - *Interference:* Superposition of two coherent wave sources (constructive: path diff $= n\lambda$; destructive: path diff $= (n + \frac{1}{2})\lambda$).
  - *Polarization:* Restriction of wave vibrations to a single plane (proves light is transverse).

---

## 12. Sound Waves and Acoustics
- **Speed of Sound:** Fastest in solids ($v_{solid} > v_{liquid} > v_{gas}$); increases with temperature and humidity; independent of pressure.
- **Echo Formulation:**
  $$v = \frac{2d}{t} \quad \implies d = \frac{vt}{2}$$
- **Vibration in Strings and Pipes:**
  - *Stretched String:* Fundamental frequency $f_0 = \frac{v}{2L} = \frac{1}{2L}\sqrt{\frac{T}{\mu}}$ ($T =$ tension, $\mu = \frac{m}{L} =$ mass per unit length).
  - *Open Organ Pipe (Open at both ends):* Contains all harmonics:
    $$f_n = \frac{n v}{2L} \quad (n = 1, 2, 3, \dots) \implies f_1 : f_2 : f_3 = 1 : 2 : 3$$
  - *Closed Organ Pipe (Closed at one end):* Contains only odd harmonics:
    $$f_n = \frac{n v}{4L} \quad (n = 1, 3, 5, \dots) \implies f_1 : f_3 : f_5 = 1 : 3 : 5$$
  - *Overtones vs Harmonics:*
    - Open pipe: 1st overtone $= 2f_0$ (2nd harmonic).
    - Closed pipe: 1st overtone $= 3f_0$ (3rd harmonic).
- **Beats:** Produced by two notes of slightly different frequencies: $f_{beat} = |f_1 - f_2|$.
- **Pitch vs Loudness vs Quality:**
  - *Pitch* depends on Frequency.
  - *Loudness* depends on Amplitude and intensity.
  - *Quality / Timbre* depends on Overtones / waveform.

---

## 13. Reflection & Refraction of Light (Mirrors and Lenses)
- **Plane Mirrors:** Image is virtual, erect, laterally inverted, same size, and at equal distance behind mirror.
  - Number of images between two mirrors tilted at angle $\theta$:
    $$n = \frac{360^\circ}{\theta} - 1$$
- **Curved Mirrors & Thin Lenses Formula:**
  $$\frac{1}{f} = \frac{1}{u} + \frac{1}{v} \quad \text{and} \quad m = \frac{v}{u} = \frac{h_i}{h_o}$$
  - **Sign Convention ("Real is Positive"):**
    - Real object / real image: $u > 0, v > 0$.
    - Virtual image: $v < 0$.
    - Concave mirror / Convex lens (converging): $f > 0$.
    - Convex mirror / Concave lens (diverging): $f < 0$.
- **Refraction and Snell's Law:**
  $$n = \frac{\sin i}{\sin r} = \frac{c}{v} = \frac{\lambda_1}{\lambda_2} = \frac{\text{Real Depth}}{\text{Apparent Depth}}$$
- **Critical Angle ($C$) & Total Internal Reflection:**
  $$\sin C = \frac{1}{n}$$
  - Total internal reflection occurs only when light travels from an optically denser to a less dense medium and $i > C$. Applications: Optical fibers, periscopes, mirages.
- **Power of a Lens ($P$):**
  $$P = \frac{1}{f\text{ (in meters)}} \quad (\text{Unit: Dioptres, D})$$

---

## 14. Optical Instruments and Eye Defects
- **The Human Eye vs Camera:**
  - Iris acts like aperture/diaphragm; Retina acts like photosensitive sensor/film.
  - Accommodation: Ability of the eye to change focal length using ciliary muscles.
- **Defects of Vision:**
  - *Myopia (Short-sightedness):* Eyeball too long or lens too strong; light focuses in front of retina. Corrected with a **concave (diverging) lens**.
  - *Hypermetropia (Long-sightedness):* Eyeball too short; light focuses behind retina. Corrected with a **convex (converging) lens**.
  - *Presbyopia:* Loss of accommodation with age; corrected with bifocal lenses.
  - *Astigmatism:* Non-spherical cornea; corrected with cylindrical lenses.
- **Microscopes & Telescopes:**
  - *Compound Microscope:* Uses two convex lenses (short $f_o$ objective, larger $f_e$ eyepiece). Total magnification $M = M_o \times M_e$.
  - *Astronomical Telescope in Normal Adjustment:* Distance between lenses $L = f_o + f_e$. Magnification $M = \frac{f_o}{f_e}$.

---

# SECTION 4: ELECTRICITY AND MAGNETISM

## 15. Electrostatics and Capacitors
- **Coulomb's Law of Electrostatics:**
  $$F = \frac{1}{4\pi\varepsilon_0}\frac{q_1 q_2}{r^2} = k\frac{q_1 q_2}{r^2} \quad (k \approx 9 \times 10^9\text{ N}\cdot\text{m}^2/\text{C}^2)$$
- **Electric Field Intensity ($E$) and Potential ($V$):**
  - Electric field: $E = \frac{F}{q} = \frac{kQ}{r^2}$ ($\text{N/C}$ or $\text{V/m}$).
  - Electric potential: $V = \frac{W}{q} = \frac{kQ}{r} = Ed$ ($\text{Volts}$).
- **Capacitance ($C$):** $C = \frac{Q}{V}$ (Farads, $\text{F}$).
  - Parallel plate capacitor: $C = \frac{\varepsilon A}{d} = \frac{\varepsilon_r \varepsilon_0 A}{d}$.
  - **Capacitors in Series:** $\frac{1}{C_s} = \frac{1}{C_1} + \frac{1}{C_2} + \dots$ (Charge $Q$ is constant across all).
  - **Capacitors in Parallel:** $C_p = C_1 + C_2 + \dots$ (Voltage $V$ is constant across all).
  - **Energy Stored in Capacitor:**
    $$W = \frac{1}{2}QV = \frac{1}{2}CV^2 = \frac{Q^2}{2C}$$

---

## 16. Current Electricity and DC Circuits
- **Ohm's Law:** $V = IR$ (for metallic conductors at constant temperature).
- **Resistance Factors:**
  $$R = \frac{\rho L}{A} = \frac{\rho L}{\pi r^2}$$
  *(Resistance is doubled if length is doubled; resistance is quartered if radius is doubled).*
- **Resistors in Series & Parallel:**
  - Series: $R_s = R_1 + R_2 + \dots$, $I$ is constant.
  - Parallel: $\frac{1}{R_p} = \frac{1}{R_1} + \frac{1}{R_2} \implies R_p = \frac{R_1 R_2}{R_1 + R_2}$, $V$ is constant.
- **EMF ($E$) and Internal Resistance ($r$):**
  $$E = I(R + r) = V_{terminal} + Ir \implies V = E - Ir$$
  - Lost volts $= Ir$. Short circuit current $= \frac{E}{r}$.
- **Electrical Energy and Power:**
  - $P = IV = I^2 R = \frac{V^2}{R}$ ($\text{Watts}$).
  - Energy $= P \cdot t$ (Joules). Commercial energy unit: $1\text{ kWh} = 3.6 \times 10^6\text{ J}$.
- **Galvanometer Conversions:**
  - *To Ammeter:* Connect low resistance (**Shunt, $R_s$**) in parallel:
    $$I_g R_g = (I - I_g)R_s \implies R_s = \frac{I_g R_g}{I - I_g}$$
  - *To Voltmeter:* Connect high resistance (**Multiplier, $R_m$**) in series:
    $$V = I_g(R_g + R_m) \implies R_m = \frac{V}{I_g} - R_g$$

---

## 17. Magnetism, Electromagnetic Induction, and AC Circuits
- **Magnetic Force on Moving Charge & Conductor:**
  - Charge: $F = qvB\sin\theta$.
  - Conductor: $F = BIL\sin\theta$ (direction given by Fleming's Left-Hand Rule for motors).
- **Faraday's and Lenz's Laws of Induction:**
  - Induced EMF: $\mathcal{E} = -N\frac{\Delta\Phi}{\Delta t}$ (direction given by Fleming's Right-Hand Rule for generators; Lenz's law states that induced current opposes the change causing it).
- **Ideal Transformers:**
  $$\frac{V_s}{V_p} = \frac{N_s}{N_p} = \frac{I_p}{I_s}$$
  - Step-up: $N_s > N_p \implies V_s > V_p$ and $I_s < I_p$.
  - Efficiency ($\eta$):
    $$\eta = \frac{P_{out}}{P_{in}} \times 100\% = \frac{V_s I_s}{V_p I_p} \times 100\%$$
- **Alternating Current (AC) Circuits:**
  - $V = V_0 \sin\omega t$, $I = I_0 \sin\omega t$.
  - RMS Values: $V_{rms} = \frac{V_0}{\sqrt{2}} \approx 0.707 V_0$, $I_{rms} = \frac{I_0}{\sqrt{2}} \approx 0.707 I_0$.
  - Inductive Reactance: $X_L = 2\pi f L$ (Voltage leads current by $90^\circ$).
  - Capacitive Reactance: $X_C = \frac{1}{2\pi f C}$ (Current leads voltage by $90^\circ$).
  - Impedance of series $R$-$L$-$C$ circuit:
    $$Z = \sqrt{R^2 + (X_L - X_C)^2}$$
  - **Resonance in AC Circuits ($X_L = X_C$):**
    $$f_0 = \frac{1}{2\pi \sqrt{LC}}$$
    *(At resonance, impedance is minimum $Z = R$, current $I$ is maximum, and power factor $\cos\phi = 1$).*

---

# SECTION 5: MODERN, ATOMIC, AND NUCLEAR PHYSICS

## 18. Photoelectric Effect and Wave-Particle Duality
- **Thermionic Emission:** Emission of electrons from hot metal surfaces (used in CRT tubes).
- **Photoelectric Emission:** Emission of electrons when electromagnetic radiation strikes a metal surface.
  - **Einstein's Photoelectric Equation:**
    $$E = hf = W_0 + K.E._{max} = hf_0 + \frac{1}{2}m v_{max}^2$$
  - Work function: $W_0 = hf_0 = \frac{hc}{\lambda_0}$.
  - Stopping Potential ($V_s$): $e V_s = K.E._{max}$.
  - Increasing radiation *intensity* increases the *number* of photoelectrons emitted per second (photocurrent).
  - Increasing radiation *frequency* increases the *maximum kinetic energy* and *stopping potential* of emitted electrons.
- **de Broglie Wavelength (Wave-Particle Duality):**
  $$\lambda = \frac{h}{p} = \frac{h}{mv}$$

---

## 19. Atomic Structure, Energy Levels, and X-Rays
- **Bohr Atom & Energy Level Transitions:**
  $$\Delta E = E_2 - E_1 = hf = \frac{hc}{\lambda}$$
  - Ionization energy is the energy required to remove an electron from ground state ($n = 1$) to infinity ($n = \infty$).
- **X-Rays Production & Properties:**
  - Produced when fast-moving electrons collide with a heavy metal target (tungsten).
  - Minimum wavelength (cutoff wavelength):
    $$\lambda_{min} = \frac{hc}{eV}$$
  - Hard X-rays: High energy, high frequency, deep penetration (produced by high voltage).
  - Soft X-rays: Lower energy, longer wavelength.

---

## 20. Radioactivity and Nuclear Physics
- **Emissions & Characteristics:**
  - **Alpha ($\alpha = ^4_2\text{He}$):** High ionizing power, low penetration (stopped by paper).
  - **Beta ($\beta = ^0_{-1}e$):** Moderate ionization, moderate penetration (stopped by $5\text{ mm}$ aluminum).
  - **Gamma ($\gamma$ ray):** Uncharged EM photon, lowest ionization, highest penetration (stopped by thick lead).
- **Radioactive Decay Law:**
  $$N = N_0 \left(\frac{1}{2}\right)^{t/T_{1/2}} \quad \text{and} \quad T_{1/2} = \frac{\ln 2}{\lambda} \approx \frac{0.693}{\lambda}$$
  - Shortcut table: After $1$ half-life $\to \frac{1}{2}$ remains; after $2$ half-lives $\to \frac{1}{4}$ remains; after $3$ half-lives $\to \frac{1}{8}$ remains; after $n$ half-lives $\to \left(\frac{1}{2}\right)^n$ remains.
- **Mass Defect and Nuclear Binding Energy:**
  $$\Delta E = \Delta m \cdot c^2 \quad (1\text{ u} \approx 931\text{ MeV})$$
  - *Nuclear Fission:* Splitting of a heavy nucleus ($^{235}\text{U}$) by neutron bombardment.
  - *Nuclear Fusion:* Combining light nuclei ($^2\text{H} + ^3\text{H}$) at high temperature to form a heavier nucleus. Releases more energy per unit mass than fission.

---

## 21. Elementary Semiconductor Electronics
- **Semiconductors:** Silicon and Germanium (tetravalent).
  - *Intrinsic:* Pure semiconductor; conduction via equal numbers of electrons and holes.
  - *Extrinsic (Doped):*
    - **n-type:** Doped with pentavalent impurities (e.g., Phosphorus, Arsenic). Majority carriers = **Electrons**.
    - **p-type:** Doped with trivalent impurities (e.g., Boron, Indium). Majority carriers = **Holes**.
- **$p$-$n$ Junction Diode:**
  - Forward bias ($p$ to $+$, $n$ to $-$): Depletion layer narrows, allows current flow.
  - Reverse bias ($p$ to $-$, $n$ to $+$): Depletion layer widens, blocks current flow.
  - Application: Rectification (converting AC to DC). Full-wave bridge rectifier uses 4 diodes.

---

# SECTION 6: 10 GOLDEN STRATEGIES FOR JAMB PHYSICS

1. **Check Physical Units First:** Look at the options before solving. If the question asks for power and an option is in $\text{J}$ instead of $\text{W}$, or speed in $\text{m/s}^2$ instead of $\text{m/s}$, eliminate it instantly.
2. **Standardize Distance to Meters:** Candidates lose easy marks by plugging $\text{cm}$ or $\text{mm}$ directly into formulas. $10\text{ cm} = 0.1\text{ m}$; $500\text{ mm} = 0.5\text{ m}$.
3. **Master the Projectile Shortcuts:** If a question asks for maximum height or range, check if $\theta = 30^\circ, 45^\circ,$ or $60^\circ$. Remember $\sin 30^\circ = 0.5$, $\sin 90^\circ = 1$, and $R_{max} = \frac{u^2}{g}$.
4. **Use $g = 10\text{ m/s}^2$:** Unless explicitly specified as $9.8\text{ m/s}^2$, use $10$. It dramatically speeds up division.
5. **Real is Positive Sign Convention for Lenses:** For a convex lens ($f > 0$), if $u = 2f$, then $v = 2f$ and $m = 1$. If $u < f$, the image is virtual ($v < 0$) and magnified (magnifying glass).
6. **Harmonics in Pipes Trap:** An open pipe has all harmonics ($1, 2, 3$). A closed pipe has only odd harmonics ($1, 3, 5$). The first overtone of a closed pipe is the 3rd harmonic, not the 2nd!
7. **Series vs Parallel Rules for Capacitors vs Resistors:** Resistors in series add up ($R_s = R_1 + R_2$), but capacitors in parallel add up ($C_p = C_1 + C_2$). Do not invert them under pressure.
8. **AC Resonance Shortcut:** At resonance ($X_L = X_C$), the circuit behaves as a pure resistor. $Z = R$. Current and voltage are in phase ($\phi = 0$).
9. **Half-Life Fraction Shortcut:** If $87.5\%$ of a sample decays, $12.5\% = \frac{1}{8}$ remains. Since $\frac{1}{8} = \left(\frac{1}{2}\right)^3$, exactly 3 half-lives have elapsed.
10. **Conservation of Energy Solves Kinematics:** When height and speed are involved, $\frac{1}{2}mv^2 = mgh \implies v = \sqrt{2gh}$. You don't need time $t$ to find the velocity of a falling object.
