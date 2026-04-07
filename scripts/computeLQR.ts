/**
 * Computes optimal LQR gains for the cart-pendulum system by solving
 * the continuous-time algebraic Riccati equation (CARE) iteratively.
 *
 * This replaces hand-tuned PD gains with mathematically optimal state feedback.
 *
 * Usage: npx tsx --tsconfig tsconfig.app.json scripts/computeLQR.ts
 */

// System parameters
const M = 1.0; // cart mass
const m = 0.3; // bob mass
const l = 1.0; // rod length
const g = 9.81; // gravity
const b = 0.1; // friction

// Linearized state-space model around theta=0 (upright)
// State: [x, xDot, theta, thetaDot]
// xDDot = (F - b*xDot - m*g*theta) / (M+m)           (linearized)
// thetaDDot = ((M+m)*g*theta - F + b*xDot) / (l*(M+m))  (linearized)

const Mt = M + m; // total mass

const A = [
    [0, 1, 0, 0],
    [0, -b / Mt, (-m * g) / Mt, 0],
    [0, 0, 0, 1],
    [0, b / (l * Mt), (Mt * g) / (l * Mt), 0]
];

const B = [[0], [1 / Mt], [0], [-1 / (l * Mt)]];

// LQR weighting matrices
// Q penalizes state deviation, R penalizes control effort
// Higher Q(0,0) = faster cart return, higher Q(2,2) = tighter angle control
const Q = [
    [500, 0, 0, 0], // cart position weight (high = snappy return)
    [0, 100, 0, 0], // cart velocity weight
    [0, 0, 1000, 0], // angle weight (highest priority)
    [0, 0, 0, 100] // angular velocity weight
];

const R = [[1]]; // control effort weight

console.log("=== LQR Gain Computation ===");
console.log(`System: M=${M} m=${m} l=${l} g=${g} b=${b}`);
console.log("");
console.log("A matrix:");
A.forEach(row => console.log("  ", row.map(v => v.toFixed(4).padStart(8)).join(" ")));
console.log("B matrix:");
B.forEach(row => console.log("  ", row.map(v => v.toFixed(4).padStart(8)).join(" ")));
console.log("");

// Solve CARE: A'P + PA - PBR^{-1}B'P + Q = 0
// Using iterative method (Kleinman iteration / Newton method)

type Matrix = number[][];

function transpose(M: Matrix): Matrix {
    const rows = M.length;
    const cols = M[0].length;
    const result: Matrix = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            result[j][i] = M[i][j];
        }
    }
    return result;
}

function matMul(A: Matrix, B: Matrix): Matrix {
    const rows = A.length;
    const cols = B[0].length;
    const inner = B.length;
    const result: Matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let sum = 0;
            for (let k = 0; k < inner; k++) {
                sum += A[i][k] * B[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}

function matAdd(A: Matrix, B: Matrix, scale = 1): Matrix {
    return A.map((row, i) => row.map((val, j) => val + scale * B[i][j]));
}

function matScale(M: Matrix, s: number): Matrix {
    return M.map(row => row.map(v => v * s));
}

function invertScalar(R: Matrix): Matrix {
    return [[1 / R[0][0]]];
}

// Solve CARE iteratively using the Hamiltonian method / direct iteration
// P_{k+1} solves the Lyapunov equation: (A-BK_k)' P + P (A-BK_k) = -(Q + K_k' R K_k)
// K_k = R^{-1} B' P_k

// Simpler approach: direct iteration P = Q + A'P(I + BR^{-1}B'P)^{-1}A
// Or just use the iterative Riccati: dP/dt = A'P + PA - PBR^{-1}B'P + Q, integrate until steady state

function solveCARE(A: Matrix, B: Matrix, Q: Matrix, R: Matrix, maxIter = 100000, dt = 0.0001): Matrix {
    const n = A.length;
    const Bt = transpose(B);
    const At = transpose(A);
    const Rinv = invertScalar(R);
    const BRinvBt = matMul(matMul(B, Rinv), Bt);

    // Start with P = Q
    let P: Matrix = Q.map(row => [...row]);

    for (let iter = 0; iter < maxIter; iter++) {
        // dP = A'P + PA - PBR^{-1}B'P + Q
        const AtP = matMul(At, P);
        const PA = matMul(P, A);
        const PBRBtP = matMul(matMul(P, BRinvBt), P);

        const dP = matAdd(matAdd(matAdd(AtP, PA), PBRBtP, -1), Q);

        // Update P
        P = matAdd(P, dP, dt);

        // Check convergence
        if (iter % 10000 === 0) {
            const norm = dP.flat().reduce((sum, v) => sum + v * v, 0);
            if (norm < 1e-12) {
                console.log(`Converged at iteration ${iter}`);
                break;
            }
            if (iter % 50000 === 0) {
                console.log(`  iter ${iter}, dP norm = ${norm.toExponential(3)}`);
            }
        }
    }

    return P;
}

console.log("Solving Riccati equation...");
const P = solveCARE(A, B, Q, R);
console.log("");

// K = R^{-1} B' P
const Bt = transpose(B);
const Rinv = invertScalar(R);
const K = matMul(matMul(Rinv, Bt), P);

console.log("=== Optimal LQR Gains ===");
console.log(`K = [${K[0].map(v => v.toFixed(4)).join(", ")}]`);
console.log("");
console.log("Controller: F = -(K1*x + K2*xDot + K3*theta + K4*thetaDot)");
console.log("");
console.log(`  K_x     (cart position):    ${K[0][0].toFixed(4)}`);
console.log(`  K_xDot  (cart velocity):    ${K[0][1].toFixed(4)}`);
console.log(`  K_theta (pendulum angle):   ${K[0][2].toFixed(4)}`);
console.log(`  K_omega (angular velocity): ${K[0][3].toFixed(4)}`);
console.log("");
console.log("Note: LQR convention uses F = -K*state (negative feedback).");
console.log("In our controller (same-sign convention), flip the sign:");
console.log("");
console.log("function controller(state, dt) {");
console.log(`    return -${K[0][0].toFixed(2)} * state.cartPosition`);
console.log(`           -${K[0][1].toFixed(2)} * state.cartVelocity`);
console.log(`           -${K[0][2].toFixed(2)} * state.angle`);
console.log(`           -${K[0][3].toFixed(2)} * state.angularVelocity;`);
console.log("}");
