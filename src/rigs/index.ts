import type { Rig } from "@/types/Rig";
import { cartPendulumRig } from "./cartPendulum/rig";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rigRegistry: Record<string, Rig<any, any>> = {
    cartPendulum: cartPendulumRig
};

export const defaultRigId = "cartPendulum";
