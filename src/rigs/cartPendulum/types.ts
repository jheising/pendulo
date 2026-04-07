export interface CartPendulumState {
    [key: string]: number;
    x: number; // cart position (m)
    xDot: number; // cart velocity (m/s)
    theta: number; // pendulum angle from vertical (rad), 0 = up
    thetaDot: number; // angular velocity (rad/s)
}

export interface CartPendulumConfig {
    [key: string]: number;
    M: number; // cart mass (kg)
    m: number; // bob mass (kg)
    l: number; // rod length (m)
    g: number; // gravity (m/s^2)
    b: number; // friction coefficient
    maxForce: number; // force limit (N)
    sensorNoise: number; // std dev of Gaussian noise added to sensor readings
    actuatorNoise: number; // std dev of Gaussian noise added to applied force (N)
}
