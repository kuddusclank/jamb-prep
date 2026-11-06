# JAMB Mathematics — Comprehensive Study Note for Candidates (Jambites)

**Subject Code:** `MTH`  
**Total Questions in UTME:** 40 Questions  
**Time Target:** 25 – 27 Minutes  
**Maximum Scaled Score:** 100 Marks  
**Authoritative Reference:** Official JAMB IBASS Syllabus for Mathematics  

---

## Overview & How JAMB Tests Mathematics

In the UTME, Mathematics is tested via **40 multiple-choice questions** spanning five primary branches:
1. **Number and Numeration (~8 Questions):** Bases, modular arithmetic, indices, logarithms, surds, and sets.
2. **Algebra (~12 Questions):** Polynomials, quadratics, simultaneous equations, variations, AP/GP, binary operations, matrices.
3. **Geometry and Trigonometry (~10 Questions):** Euclidean plane geometry, circle theorems, mensuration, coordinate geometry, trigonometry, bearings.
4. **Calculus (~5 Questions):** Limits, differentiation (product, quotient, chain rule), turning points, and integration (definite & area under curves).
5. **Statistics and Probability (~5 Questions):** Frequency measures, mean/median/mode, standard deviation, permutations, combinations, and probability.

> [!IMPORTANT]
> **No Scientific Calculators in Exam Hall:** Candidates are provided solely with a simple 4-function digital calculator (addition, subtraction, multiplication, division). Success depends on mental math, recognizing standard algebraic identities, simplifying surds/logs, and memorizing special angle values ($30^\circ, 45^\circ, 60^\circ$).

---

# SECTION 1: NUMBER AND NUMERATION

## 1. Number Bases
- **Conversion to Base 10:** Multiply each digit by the base raised to its positional power ($0, 1, 2, \dots$ from right to left).
  $$\text{Example: } 1011_2 = (1 \times 2^3) + (0 \times 2^2) + (1 \times 2^1) + (1 \times 2^0) = 8 + 0 + 2 + 1 = 11_{10}$$
- **Conversion from Base 10 to Base $n$:** Successive division by $n$, recording remainders from bottom to top.
- **Solving Base Equations:** Express both sides in base 10 and solve for the unknown base:
  $$\text{If } 23_x = 17_{10} \implies 2x + 3 = 17 \implies 2x = 14 \implies x = 7$$
- **Biconditional Conversions (Base 2 $\leftrightarrow$ Base 8 $\leftrightarrow$ Base 16):**
  - Group binary bits into sets of 3 for Octal (Base 8).
  - Group binary bits into sets of 4 for Hexadecimal (Base 16).

---

## 2. Modular Arithmetic
Modular arithmetic deals with integers where numbers "wrap around" after reaching a fixed modulus $n$.
- $a \equiv b \pmod n$ means $a - b$ is an exact multiple of $n$, or $a$ and $b$ leave the same remainder when divided by $n$.
- **Addition & Multiplication in Modulo:** Always divide the normal result by $n$ and write down the **remainder**.
  - $(7 + 9) \pmod 5 = 16 \pmod 5 = 1$
  - $(4 \times 6) \pmod 7 = 24 \pmod 7 = 3$
- **Finding Multiplicative Inverses in Modulo:** The inverse of $x$ modulo $n$ is a number $y$ such that $(x \times y) \equiv 1 \pmod n$.
  - In modulo 7, what is the inverse of 3? $3 \times 5 = 15 = (2 \times 7) + 1 \equiv 1 \pmod 7$. Thus, $3^{-1} \equiv 5 \pmod 7$.

---

## 3. Indices, Logarithms, and Surds

### A. Laws of Indices
1. $a^m \times a^n = a^{m+n}$
2. $a^m \div a^n = a^{m-n}$
3. $(a^m)^n = a^{mn}$
4. $a^0 = 1$ ($a \neq 0$)
5. $a^{-n} = \frac{1}{a^n}$
6. $a^{m/n} = \sqrt[n]{a^m} = (\sqrt[n]{a})^m$

### B. Laws of Logarithms
1. $\log_a (xy) = \log_a x + \log_a y$
2. $\log_a \left(\frac{x}{y}\right) = \log_a x - \log_a y$
3. $\log_a (x^k) = k \log_a x$
4. $\log_a a = 1$ and $\log_a 1 = 0$
5. **Change of Base:** $\log_b a = \frac{\log_c a}{\log_c b} = \frac{1}{\log_a b}$
6. **Power Base Rule:** $\log_{b^n} a = \frac{1}{n} \log_b a$

### C. Surds (Radicals)
- **Simplification:** $\sqrt{a \times b} = \sqrt{a} \times \sqrt{b}$ (e.g., $\sqrt{75} = \sqrt{25 \times 3} = 5\sqrt{3}$).
- **Addition/Subtraction:** Only like surds can combine: $3\sqrt{2} + 5\sqrt{2} = 8\sqrt{2}$.
- **Conjugate of a Binomial Surd:** The conjugate of $(a + \sqrt{b})$ is $(a - \sqrt{b})$, and their product is rational: $(a+\sqrt{b})(a-\sqrt{b}) = a^2 - b$.
- **Rationalizing the Denominator:**
  $$\frac{2}{3 - \sqrt{5}} = \frac{2(3 + \sqrt{5})}{(3 - \sqrt{5})(3 + \sqrt{5})} = \frac{6 + 2\sqrt{5}}{9 - 5} = \frac{6 + 2\sqrt{5}}{4} = \frac{3 + \sqrt{5}}{2}$$

---

## 4. Sets and Venn Diagrams
- **Definitions:** Universal set ($\mathcal{U}$), Empty set ($\emptyset$ or $\{\}$), Complement ($A'$), Subset ($A \subseteq B$).
- **Number of Subsets:** A set with $n$ elements has $2^n$ total subsets and $2^n - 1$ proper subsets.
- **Two-Set Formula:**
  $$n(A \cup B) = n(A) + n(B) - n(A \cap B)$$
- **Three-Set Formula:**
  $$n(A \cup B \cup C) = n(A) + n(B) + n(C) - n(A \cap B) - n(A \cap C) - n(B \cap C) + n(A \cap B \cap C)$$
- **Exam Shortcut:** In 3-set word problems, always draw the Venn diagram and fill from the innermost triple intersection $n(A \cap B \cap C)$ outward.

---

# SECTION 2: ALGEBRA

## 5. Polynomials & Remainder / Factor Theorems
- **Remainder Theorem:** If a polynomial $P(x)$ is divided by $(x - a)$, the remainder is $R = P(a)$.
  - If divided by $(ax + b)$, the remainder is $P\left(-\frac{b}{a}\right)$.
- **Factor Theorem:** $(x - a)$ is a factor of $P(x)$ if and only if $P(a) = 0$ (the remainder is zero).

---

## 6. Quadratic Equations & Inequalities
- **Standard Form:** $ax^2 + bx + c = 0$
- **Quadratic Formula:**
  $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
- **The Discriminant ($\Delta = b^2 - 4ac$):**
  - If $\Delta > 0$ and a perfect square $\rightarrow$ Roots are real, rational, and unequal.
  - If $\Delta > 0$ and not a perfect square $\rightarrow$ Roots are real, irrational, and unequal.
  - If $\Delta = 0 \rightarrow$ Roots are real and equal (coincident).
  - If $\Delta < 0 \rightarrow$ Roots are non-real / complex / imaginary.
- **Sum and Product of Roots ($\alpha, \beta$):**
  $$\alpha + \beta = -\frac{b}{a}, \quad \alpha \beta = \frac{c}{a}$$
- **Forming a Quadratic from Roots:**
  $$x^2 - (\text{Sum of Roots})x + (\text{Product of Roots}) = 0$$
- **High-Yield Algebraic Identities:**
  - $\alpha^2 + \beta^2 = (\alpha + \beta)^2 - 2\alpha\beta$
  - $\frac{1}{\alpha} + \frac{1}{\beta} = \frac{\alpha + \beta}{\alpha\beta}$
  - $(\alpha - \beta)^2 = (\alpha + \beta)^2 - 4\alpha\beta$

---

## 7. Variation
1. **Direct Variation:** $y \propto x \implies y = kx$
2. **Inverse Variation:** $y \propto \frac{1}{x} \implies y = \frac{k}{x}$
3. **Joint Variation:** $y \propto xz \implies y = kxz$
4. **Partial Variation:** $y$ is partly constant and partly varies with $x$:
   $$y = a + bx \quad (a, b \text{ are constants found via simultaneous equations})$$

---

## 8. Progressions (AP and GP)

### A. Arithmetic Progression (AP)
- $n$-th term: $T_n = a + (n - 1)d$ ($a$ = first term, $d$ = common difference $T_2 - T_1$)
- Sum of first $n$ terms:
  $$S_n = \frac{n}{2}[2a + (n - 1)d] = \frac{n}{2}(a + l) \quad (l \text{ is the last term})$$
- Arithmetic Mean between $x$ and $y$: $\frac{x + y}{2}$

### B. Geometric Progression (GP)
- $n$-th term: $T_n = ar^{n-1}$ ($r$ = common ratio $\frac{T_2}{T_1}$)
- Sum of first $n$ terms:
  $$S_n = \frac{a(1 - r^n)}{1 - r} \quad (\text{for } |r| < 1) \quad \text{or} \quad S_n = \frac{a(r^n - 1)}{r - 1} \quad (\text{for } |r| > 1)$$
- Sum to Infinity ($S_\infty$) — Exists only when $-1 < r < 1$:
  $$S_\infty = \frac{a}{1 - r}$$
- Geometric Mean between $x$ and $y$: $\sqrt{xy}$

---

## 9. Binary Operations
A binary operation $*$ combines two elements of a set to yield a single element.
- **Closure:** $a * b \in S$ for all $a, b \in S$.
- **Commutativity:** $a * b = b * a$.
- **Associativity:** $(a * b) * c = a * (b * c)$.
- **Identity Element ($e$):** $a * e = e * a = a$.
- **Inverse Element ($a^{-1}$):** $a * a^{-1} = a^{-1} * a = e$.

---

## 10. Matrices and Determinants
- **Determinant of a $2 \times 2$ Matrix:**
  $$A = \begin{pmatrix} a & b \\ c & d \end{pmatrix} \implies \det(A) = |A| = ad - bc$$
- **Singular Matrix:** A matrix whose determinant is zero ($\det(A) = 0$). It has no inverse.
- **Inverse of a $2 \times 2$ Matrix:**
  $$A^{-1} = \frac{1}{\det(A)} \begin{pmatrix} d & -b \\ -c & a \end{pmatrix}$$
- **Matrix Multiplication Condition:** Matrix $A_{m \times n}$ can multiply $B_{p \times q}$ only if $n = p$. The resulting matrix has order $m \times q$.

---

# SECTION 3: GEOMETRY AND TRIGONOMETRY

## 11. Euclidean Plane Geometry & Circle Theorems
- **Angles on a Straight Line:** Sum $= 180^\circ$.
- **Angles at a Point:** Sum $= 360^\circ$.
- **Polygons:**
  - Sum of interior angles of an $n$-sided polygon: $(n - 2) \times 180^\circ$ or $(2n - 4) \times 90^\circ$.
  - Each interior angle of a regular polygon: $\frac{(n - 2) \times 180^\circ}{n}$.
  - Sum of exterior angles of ANY polygon: $360^\circ$.
- **The 6 Critical Circle Theorems for UTME:**
  1. The angle subtended by an arc at the center is **twice** the angle subtended at the circumference: $\angle \text{center} = 2 \times \angle \text{circumference}$.
  2. The angle in a semicircle is a **right angle ($90^\circ$)**.
  3. Angles in the **same segment** of a circle are equal.
  4. Opposite angles of a **cyclic quadrilateral** sum to $180^\circ$ (supplementary).
  5. The angle between a tangent and a chord through the point of contact equals the angle in the **alternate segment**.
  6. Tangents drawn from an external point to a circle are **equal in length**.

---

## 12. Mensuration of Plane and Solid Shapes
- **Arc Length of a Sector:** $L = \frac{\theta}{360} \times 2\pi r$
- **Area of a Sector:** $A = \frac{\theta}{360} \times \pi r^2 = \frac{1}{2}Lr$
- **Perimeter of a Sector:** $P = 2r + L$
- **Cylinder:**
  - Curved Surface Area $= 2\pi rh$
  - Total Surface Area (closed) $= 2\pi r(h + r)$
  - Volume $= \pi r^2 h$
- **Cone:**
  - Curved Surface Area $= \pi r l$ (where slant height $l = \sqrt{r^2 + h^2}$)
  - Volume $= \frac{1}{3}\pi r^2 h$
- **Sphere:**
  - Surface Area $= 4\pi r^2$
  - Volume $= \frac{4}{3}\pi r^3$
- **Frustum of a Cone/Pyramid:**
  $$\text{Volume} = \text{Volume of Big Cone} - \text{Volume of Small Cut-off Cone}$$

---

## 13. Coordinate Geometry
- **Distance between $(x_1, y_1)$ and $(x_2, y_2)$:**
  $$d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
- **Midpoint:**
  $$\left(\frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2}\right)$$
- **Gradient / Slope ($m$):**
  $$m = \frac{y_2 - y_1}{x_2 - x_1} = \tan \theta$$
- **Equation of a Straight Line:**
  - Slope-intercept form: $y = mx + c$
  - Point-slope form: $y - y_1 = m(x - x_1)$
- **Parallel Lines:** $m_1 = m_2$
- **Perpendicular Lines:** $m_1 \times m_2 = -1 \implies m_2 = -\frac{1}{m_1}$

---

## 14. Trigonometry and Bearings

### A. Special Angles Table (Must Memorize!)
| Ratio | $0^\circ$ | $30^\circ$ | $45^\circ$ | $60^\circ$ | $90^\circ$ |
| :---: | :---: | :---: | :---: | :---: | :---: |
| $\sin \theta$ | $0$ | $\frac{1}{2}$ | $\frac{1}{\sqrt{2}} = \frac{\sqrt{2}}{2}$ | $\frac{\sqrt{3}}{2}$ | $1$ |
| $\cos \theta$ | $1$ | $\frac{\sqrt{3}}{2}$ | $\frac{1}{\sqrt{2}} = \frac{\sqrt{2}}{2}$ | $\frac{1}{2}$ | $0$ |
| $\tan \theta$ | $0$ | $\frac{1}{\sqrt{3}} = \frac{\sqrt{3}}{3}$ | $1$ | $\sqrt{3}$ | Undefined |

### B. Triangle Rules
- **Sine Rule:** Used when given 2 angles and 1 side, or 2 sides and a non-included angle:
  $$\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}$$
- **Cosine Rule:** Used when given 2 sides and the included angle, or all 3 sides:
  $$a^2 = b^2 + c^2 - 2bc \cos A \implies \cos A = \frac{b^2 + c^2 - a^2}{2bc}$$
- **Area of ANY Triangle:**
  $$\text{Area} = \frac{1}{2}ab \sin C = \sqrt{s(s - a)(s - b)(s - c)} \quad (\text{Heron's Formula, where } s = \frac{a+b+c}{2})$$

### C. Bearings
- **Three-Figure Bearings:** Measured strictly clockwise from True North ($000^\circ$ to $360^\circ$).
- **Reverse Bearing Rule:** If forward bearing is $\theta$:
  - If $\theta < 180^\circ \implies \text{Reverse Bearing} = \theta + 180^\circ$
  - If $\theta > 180^\circ \implies \text{Reverse Bearing} = \theta - 180^\circ$

---

# SECTION 4: CALCULUS

## 15. Differentiation

### A. Fundamental Rules
1. **Power Rule:** $y = a x^n \implies \frac{dy}{dx} = a n x^{n-1}$
2. **Trigonometric Derivatives:**
   $$\frac{d}{dx}(\sin x) = \cos x, \quad \frac{d}{dx}(\cos x) = -\sin x$$
3. **Product Rule ($y = u \cdot v$):**
   $$\frac{dy}{dx} = u\frac{dv}{dx} + v\frac{du}{dx}$$
4. **Quotient Rule ($y = \frac{u}{v}$):**
   $$\frac{dy}{dx} = \frac{v\frac{du}{dx} - u\frac{dv}{dx}}{v^2}$$
5. **Chain Rule (Function of a Function, $y = f(u)$ where $u = g(x)$):**
   $$\frac{dy}{dx} = \frac{dy}{du} \times \frac{du}{dx}$$

### B. Turning Points (Maxima and Minima)
- At turning/stationary points: $\frac{dy}{dx} = 0$.
- Test for Nature of Turning Point:
  - If $\frac{d^2y}{dx^2} < 0 \implies$ **Local Maximum Point**.
  - If $\frac{d^2y}{dx^2} > 0 \implies$ **Local Minimum Point**.
  - If $\frac{d^2y}{dx^2} = 0 \implies$ Point of Inflexion.

---

## 16. Integration
Integration is the reverse process of differentiation.

### A. Indefinite Integrals
$$\int x^n \, dx = \frac{x^{n+1}}{n + 1} + c \quad (n \neq -1)$$
$$\int \cos x \, dx = \sin x + c, \quad \int \sin x \, dx = -\cos x + c$$

### B. Definite Integrals & Area Under a Curve
$$\int_{a}^{b} f(x) \, dx = [F(x)]_{a}^{b} = F(b) - F(a)$$
- The area enclosed by the curve $y = f(x)$, the $x$-axis, and vertical lines $x = a$ and $x = b$ is given by $\int_{a}^{b} y \, dx$.

---

# SECTION 5: STATISTICS AND PROBABILITY

## 17. Measures of Central Tendency & Dispersion
- **Mean ($\bar{x}$):** $\frac{\sum x}{n}$ (ungrouped) or $\frac{\sum fx}{\sum f}$ (grouped).
- **Median:** The middle value when arranged in ascending order.
- **Mode:** The most frequently occurring value.
- **Range:** Highest Value $-$ Lowest Value.
- **Variance ($\sigma^2$):**
  $$\sigma^2 = \frac{\sum (x - \bar{x})^2}{n} = \frac{\sum x^2}{n} - (\bar{x})^2$$
- **Standard Deviation ($\sigma$):** $\sigma = \sqrt{\text{Variance}}$

---

## 18. Permutations, Combinations & Probability

### A. Permutations (Arrangements — Order Matters!)
$$^n P_r = \frac{n!}{(n - r)!}$$
- **Arranging letters with repetitions:** The number of ways to arrange the letters in the word **SUCCESS** (7 letters: 3 S's, 2 C's):
  $$\frac{7!}{3! \times 2!} = \frac{5040}{6 \times 2} = 420 \text{ ways}$$

### B. Combinations (Selections — Order Does NOT Matter!)
$$^n C_r = \frac{n!}{r!(n - r)!}$$
- Useful identity: $^n C_r = {^n C_{n-r}}$

### C. Probability Rules
- **Range of Probability:** $0 \le P(E) \le 1$.
- **Complementary Events:** $P(E') = 1 - P(E)$.
- **Mutually Exclusive Events ($A$ and $B$ cannot occur together):**
  $$P(A \text{ or } B) = P(A \cup B) = P(A) + P(B)$$
- **Independent Events ($A$ has no effect on $B$):**
  $$P(A \text{ and } B) = P(A \cap B) = P(A) \times P(B)$$

---

# SECTION 6: 10 GOLDEN STRATEGIES FOR JAMB MATHEMATICS

1. **Answer Low-Hanging Fruit First:** Questions on sets, simple indices, mean/median, and binary operations take less than 20 seconds. Secure these marks before tackling 3D mensuration or calculus.
2. **Plug in the Options (Back-Solving):** When solving complex quadratic, logarithmic, or modular equations, try substituting the 4 given options into the equation instead of performing lengthy derivations.
3. **Memorize Special Angle Triangles:** Never waste time deriving $\sin 30^\circ$ or $\cos 45^\circ$. Have them on your fingertips.
4. **Beware the Negative Sign in Calculus:** Remember that $\frac{d}{dx}(\cos x) = -\sin x$ and $\int \sin x \, dx = -\cos x + c$. Missing the minus sign is the #1 reason candidates pick distractor options.
5. **Watch the Constant of Integration:** On definite integrals, evaluate $[F(b) - F(a)]$ carefully; do not leave an uncalculated $c$.
6. **Perpendicular Line Gradients:** In coordinate geometry, if line 1 has slope $\frac{2}{3}$, a perpendicular line MUST have slope $-\frac{3}{2}$.
7. **Simplify Surds by Finding Perfect Square Factors:** Decompose numbers into $4, 9, 16, 25, 36, 49, 64, 81, 100$ before simplifying.
8. **Check the Base in Logarithms:** Ensure all log terms are in the same base before applying addition or subtraction laws. If bases differ, use the change of base formula immediately.
9. **Sum of Angles of Polygons:** For an $n$-sided polygon, exterior angles ALWAYS sum to $360^\circ$. If each exterior angle is $40^\circ$, the polygon has $\frac{360}{40} = 9$ sides.
10. **Target Pace:** Aim for 40 questions in 25 minutes. If a question exceeds 60 seconds without a clear path to the answer, flag it (`R`) and move on.

---
*End of Mathematics Comprehensive Study Note.*
