var Computation = /** @class */ (function () {
    function Computation(calculationInput) {
        this.calculationInput = calculationInput;
        this.pipes = calculationInput;
    }
    Computation.prototype.compute = function () {
        for (var i = 0; i < this.pipes.length; i++) {
            this.pipe_length.push(Math.sqrt(Math.pow(this.pipes[i].horizontal_change, 2) + Math.pow(this.pipes[i].vertical_change, 2)));
            this.mean_diameter.push(this.pipes[i].inner_diamter * Math.pow(1 + (Inputs.volumetric_expansion / 100), 0.5));
            this.nonDimensional_Roughness.push(this.pipes[i].roughness / this.mean_diameter[i]);
            this.fluid_rate.push(Inputs.required_flowrate / 3600 / this.pipes[i].cores);
            this.fluid_velocity.push(this.fluid_rate[i] / (Math.PI * Math.pow((this.mean_diameter[i] / 1000 / 2), 2)));
            this.reynolds.push((Inputs.density * this.fluid_velocity[i] * this.mean_diameter[i] / 1000) / (Inputs.viscosity / 1000));
            // switch to chosen fluid model: laminar, transitional, turbulent
            var ff_laminar = 64 / this.reynolds[i];
            var ff_colebrook = this.colebrookFrictionCoefficient(this.nonDimensional_Roughness[i], this.reynolds[i]);
            if (this.reynolds[i] < Inputs.Re_laminar_max) {
                this.correlation.push("Laminar");
                this.friction_factor.push(ff_laminar);
            }
            else if (this.reynolds[i] >= Inputs.Re_laminar_max && this.reynolds[i] < Inputs.Re_transitional_max) {
                this.correlation.push("Transitional");
                var ff_transitional = (this.reynolds[i] - Inputs.Re_laminar_max) * (ff_colebrook - ff_laminar) / (Inputs.Re_transitional_max - Inputs.Re_laminar_max) + ff_laminar;
                this.friction_factor.push(ff_transitional);
            }
            else {
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
            var geometryArrayObj = new ChartArrayObject;
            geometryArrayObj.x = this.distance_x[i + 1];
            geometryArrayObj.y = this.displacement_y[i + 1];
            if (i === 0) {
                this.cumulative_length.push(this.pipe_length[0]);
                this.geometry.push({ x: 0, y: 0 });
                this.geometry.push(geometryArrayObj);
            }
            else {
                this.cumulative_length.push(this.cumulative_length[i - 1] + this.pipe_length[i]);
                this.geometry.push(geometryArrayObj);
            }
        }
        //sum array
        var total_pressure_drop = this.pressure_drop_overall.reduce(function (a, b) { return a + b; }, 0);
        // pressure drop
        var previousPressure = 0;
        for (var i = 0; i < this.pressure_drop_overall.length + 1; i++) {
            var pressureProfileObj = new ChartArrayObject();
            if (i === 0) {
                pressureProfileObj.x = 0;
                pressureProfileObj.y = Inputs.outlet_pressure + total_pressure_drop;
                previousPressure = Inputs.outlet_pressure + total_pressure_drop;
            }
            else {
                pressureProfileObj.x = this.cumulative_length[i - 1];
                pressureProfileObj.y = previousPressure - this.pressure_drop_overall[i - 1];
                previousPressure -= this.pressure_drop_overall[i - 1];
            }
            this.pressure_profile.push(pressureProfileObj);
        }
        var chartData = new ChartData(this.pressure_profile, this.geometry);
    };
    Computation.prototype.colebrookFrictionCoefficient = function (nonDimensional_Roughness, reynolds) {
        function f(x) {
            return -2 * Math.log10(nonDimensional_Roughness / 3.7 + 2.51 / (reynolds * Math.sqrt(x))) - 1 / Math.sqrt(x);
        }
        return nr(f, 0.01);
    };
    return Computation;
}());
var ChartArrayObject = /** @class */ (function () {
    function ChartArrayObject() {
    }
    return ChartArrayObject;
}());
var ChartData = /** @class */ (function () {
    function ChartData(pressure_profile, geometry) {
        this.pressure_profile = pressure_profile;
        this.geometry = geometry;
    }
    return ChartData;
}());
var Pipe = /** @class */ (function () {
    function Pipe() {
    }
    return Pipe;
}());
var Inputs = /** @class */ (function () {
    function Inputs() {
    }
    return Inputs;
}());
var pipey = new Pipe();
pipey.horizontal_change = 7;
var pipeys = [pipey, pipey];
var c = new Computation(pipeys);
c.pipes;