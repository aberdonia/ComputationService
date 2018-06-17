// TODO add module to typescript
//var nr = require('newton-raphson-method');

class Computation {

    pipes: Array<Pipe>;

    pipe_length: Array<number>;
    cumulative_length: Array<number>;
    mean_diameter: Array<number>;
    nonDimensional_Roughness: Array<number>;
    fluid_rate: Array<number>;
    fluid_velocity: Array<number>;
    reynolds: Array<number>;

    correlation: Array<string>;
    friction_factor: Array<number>;
    pressure_drop_friction: Array<number>;
    pressure_drop_static: Array<number>;
    pressure_drop_overall: Array<number>;

    distance_x: Array<number>;
    displacement_y: Array<number>;

    // chart keys
    geometry: Array<ChartArrayObject>;
    pressure_profile: Array<ChartArrayObject>;


    constructor(public calculationInput: Array<Pipe>) {
        this.pipes = calculationInput;
    }

    compute() {
        for (let i = 0; i < this.pipes.length; i++) {
            this.pipe_length.push(Math.sqrt(Math.pow(this.pipes[i].horizontal_change, 2) + Math.pow(this.pipes[i].vertical_change, 2)));
            this.mean_diameter.push(this.pipes[i].inner_diamter * Math.pow(1 + (Inputs.volumetric_expansion / 100), 0.5));
            this.nonDimensional_Roughness.push(this.pipes[i].roughness / this.mean_diameter[i]);
            this.fluid_rate.push(Inputs.required_flowrate / 3600 / this.pipes[i].cores);
            this.fluid_velocity.push(this.fluid_rate[i] / (Math.PI * Math.pow((this.mean_diameter[i] / 1000 / 2), 2)));
            this.reynolds.push((Inputs.density * this.fluid_velocity[i] * this.mean_diameter[i] / 1000) / (Inputs.viscosity / 1000));

            // switch to chosen fluid model: laminar, transitional, turbulent
            const ff_laminar = 64 / this.reynolds[i];
            const ff_colebrook = this.colebrookFrictionCoefficient(this.nonDimensional_Roughness[i], this.reynolds[i]);
            if (this.reynolds[i] < Inputs.Re_laminar_max) {
                this.correlation.push("Laminar");
                this.friction_factor.push(ff_laminar);
            } else if (this.reynolds[i] >= Inputs.Re_laminar_max && this.reynolds[i] < Inputs.Re_transitional_max) {
                this.correlation.push("Transitional");

                const ff_transitional = (this.reynolds[i] - Inputs.Re_laminar_max) * (ff_colebrook - ff_laminar) / (Inputs.Re_transitional_max - Inputs.Re_laminar_max) + ff_laminar;
                this.friction_factor.push(ff_transitional);
            } else {
                this.correlation.push("Turbulent");
                this.friction_factor.push(ff_colebrook);
            }

            this.pressure_drop_friction.push(this.friction_factor[i] * this.pipe_length[i] / (this.mean_diameter[i] / 1000) * Inputs.density * Math.pow(this.fluid_velocity[i], 2) / 2 * 0.00001);
            this.pressure_drop_static.push(Inputs.density * 9.81 * this.pipes[i].vertical_change / 100000);
            this.pressure_drop_overall.push(this.pressure_drop_friction[i] - this.pressure_drop_static[i]);


            // convert to number so js doesn't interpret as string and concat
            this.distance_x.push(this.distance_x[i] + Number(this.pipes[i].horizontal_change));
            this.displacement_y.push(this.displacement_y[i] - this.pipes[i].vertical_change);

            // ****build graph inputs***
            let geometryArrayObj = new ChartArrayObject;
            geometryArrayObj.x = this.distance_x[i + 1];
            geometryArrayObj.y = this.displacement_y[i + 1];

            if (i === 0) {
                this.cumulative_length.push(this.pipe_length[0]);
                this.geometry.push({x: 0, y: 0});
                this.geometry.push(geometryArrayObj);
            } else {
                this.cumulative_length.push(this.cumulative_length[i - 1] + this.pipe_length[i]);
                this.geometry.push(geometryArrayObj);
            }

        }


        //sum array
        const total_pressure_drop = this.pressure_drop_overall.reduce((a, b) => a + b, 0);

        // pressure drop
        let previousPressure = 0;
        for (let i = 0; i < this.pressure_drop_overall.length + 1; i++) {
            let pressureProfileObj = new ChartArrayObject();

            if (i === 0) {
                pressureProfileObj.x = 0;
                pressureProfileObj.y = Inputs.outlet_pressure + total_pressure_drop;
                previousPressure = Inputs.outlet_pressure + total_pressure_drop;
            } else {
                pressureProfileObj.x = this.cumulative_length[i - 1];
                pressureProfileObj.y = previousPressure - this.pressure_drop_overall[i - 1];
                previousPressure -= this.pressure_drop_overall[i - 1];
            }
            this.pressure_profile.push(pressureProfileObj);
        }

        let chartData = new ChartData(this.pressure_profile, this.geometry)

    }

    colebrookFrictionCoefficient(nonDimensional_Roughness: number, reynolds: number) {
        function f(x) {
            return -2 * Math.log10(nonDimensional_Roughness / 3.7 + 2.51 / (reynolds * Math.sqrt(x))) - 1 / Math.sqrt(x);
        }

        return nr(f, 0.01);

    }
}


class ChartArrayObject {
    x: number;
    y: number;
}

class ChartData {
    pressure_profile: Array<ChartArrayObject>;
    geometry: Array<ChartArrayObject>;

    constructor(pressure_profile: Array<ChartArrayObject>, geometry: Array<ChartArrayObject>) {
        this.pressure_profile = pressure_profile;
        this.geometry = geometry;
    }
}


class Pipe {
    description: string;
    horizontal_change: number;
    vertical_change: number;
    inner_diamter: number;
    roughness: number;
    cores: number
}

class Inputs {
    static x: 17;
    static y: 2;
    static volumetric_expansion: 0;
    static C_Value_Threshold_for_Erosion: 125;
    static required_flowrate: 0.5; //m3/hr
    static density: 1070; //kg/m3
    static viscosity: 6.98; //cP
    static outlet_pressure: 630; //bar
    static Re_laminar_max: 2000;
    static Re_transitional_max: 4000


}

let pipey = new Pipe();
pipey.horizontal_change = 7;
let pipeys = [pipey, pipey];
let c = new Computation(pipeys);

c.pipes;
