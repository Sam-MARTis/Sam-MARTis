const doFractals = () => {
  let fractalCanvas;
  let fractalCtx;
  let fractalmine;

  let offset = 0;
  let paramValues = new Object();

  let devicePixelRatio;

  const getRandomInt = (rangeL, rangeH) => {
    return Math.floor(rangeL) + Math.floor(Math.random() * (rangeH - rangeL));
  };

  let totalCounts = 0;
  let countLimit = 5;
  let branches = getRandomInt(2, 8);

  let color = `hsl(${Math.random() * 360}, 100%, 50%)`;

  const resetParamValues = () => {
    let scaleLen = 0.4 + Math.random() * 0.5;
    let winRatio = Math.min(window.innerWidth, window.innerHeight) / 900;
    paramValues = {
      lineWidth:
        (6 + Math.random() * 3) *
        (winRatio ** 0.5 * (winRatio < 1) + winRatio ** 0.8 * (winRatio >= 1)),
      scaleFactorLen: scaleLen,
      scaleFactorWidth: (0.5 + Math.random() * 0.4) / (1 + scaleLen),

      angleRate: 0.5 + Math.random() * 5,
      divergence1: 0.5 + Math.random() * 3.14,
      divergence2: 0.5 + Math.random() * 3.14,
      scaleFactorAngleRate: 200 * Math.random(),
      color: `hsl(${Math.random() * 560}, 100%, 50%)`,
    };
  };
  const rotate = () => {
    fractalCtx.rotate((1 * Math.PI) / 180);
    reset();
  };
  window.addEventListener("load", () => {
    fractalCanvas = document.getElementById("canvas2");
    fractalCtx = fractalCanvas.getContext("2d");
    devicePixelRatio = window.devicePixelRatio || 1;

    fractalCanvas.width = window.innerWidth * devicePixelRatio;
    fractalCanvas.height = window.innerHeight * devicePixelRatio;

    fractalCanvas.style.width = window.innerWidth + "px";
    fractalCanvas.style.height = window.innerHeight + "px";

    fractalCtx.scale(devicePixelRatio, devicePixelRatio);

    resetParamValues();

    reset();
    setInterval(rotate, 10);
    setInterval(randomize, 1500);
    addEventListener("resize", reset);
    addEventListener("click", incSize);
  });

  const reset = () => {
  
  let fractalContainerMine = document.getElementById("projectContainer");
  fractalCtx = fractalCanvas.getContext("2d");

  let containerWidth = fractalContainerMine.offsetWidth;
  let containerHeight = fractalContainerMine.offsetHeight;

  fractalCanvas.width = containerWidth * devicePixelRatio;
  fractalCanvas.height = containerHeight * devicePixelRatio;

  fractalCanvas.style.width = containerWidth + "px";
  fractalCanvas.style.height = containerHeight + "px";

  fractalCtx.scale(devicePixelRatio, devicePixelRatio);
  fractalCtx.lineCap = "square";
  fractalCtx.lineDashOffset = 30;
  fractalCtx.shadowBlur = 0;
  fractalCtx.shadowColor = color;

  // console.log("fractalCanvasResize");
  fractalmine = new Fractal(
    fractalCtx,
    containerWidth,
    containerHeight,
    totalCounts,
    branches,
    offset,
    paramValues
  );
  fractalmine.callAnimation();
};
  const incSize = () => {
    if (totalCounts < countLimit) {
      totalCounts += 1;
      reset();
    }
  };
  setInterval(incSize, 10);

  const randomize = () => {
    fractalCtx.clearRect(0, 0, window.width, window.height);

    let newBranches = 2 + getRandomInt(0, 8);
    color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    offset = 3.14 * (Math.random() > 0.5);
    while (newBranches == branches) {
      newBranches = 2 + +getRandomInt(0, 8);
    }
    branches = newBranches;
    resetParamValues();
    reset();
  };

  // setInterval(randomize, 200);

  class Fractal {
    #fractalCtx;
    #width;
    #height;

    constructor(fractalCtx, width, height, count, branches, offset, params) {
      this.#fractalCtx = fractalCtx;
      this.#width = width;
      this.#height = height;
      this.totalCounts = count;
      this.offset = offset;
      this.branches = branches;
      this.#fractalCtx.strokeStyle = color;

      this.length = Math.min(this.#width / 5, this.#height / 5);

      this.lineWidth = params["lineWidth"];
      this.scaleFactorLen = params["scaleFactorLen"];
      this.scaleFactorWidth = params["scaleFactorWidth"];

      this.angleRate = params["angleRate"];
      this.divergence2 = params["divergence2"];

      this.scaleFactorAngleRate = params["scaleFactorAngleRate"];
      // this.lineWidth *= this.length/193;
      // this.scaleFactorWidth *= 193/this.length;
      // if(this.scaleFactorWidth>0.9){
      //     this.scaleFactorWidth = 0.9;
      // }
      // console.log(this.length);
    }

    drawAngle = (angle, posx, posy, length) => {
      this.#fractalCtx.beginPath();
      this.#fractalCtx.moveTo(posx, posy);

      this.#fractalCtx.lineTo(
        posx + length * Math.cos(angle),
        posy + length * Math.sin(-angle)
      );
      this.#fractalCtx.stroke();
    };
    animate(
      angleTo = 0.57,
      delAngle = 1,
      angleRate = this.angleRate,
      posx = this.#width / 2,
      posy = this.#height / 2,
      length = this.length,
      counter = this.totalCounts,
      lineWidth = this.lineWidth
    ) {
      this.count += 1;
      angleTo += angleRate * delAngle;
      let xmov = length * Math.cos(angleTo);
      let ymov = length * Math.sin(-angleTo);

      lineWidth *= this.scaleFactorWidth ** 1;
      this.#fractalCtx.lineWidth = lineWidth;
      this.drawAngle(angleTo, posx, posy, length);
      posx += xmov / 2;
      posy += ymov / 2;
      length *= this.scaleFactorLen ** 1;
      angleRate *= this.scaleFactorAngleRate;

      if (counter > 0) {
        this.animate(
          angleTo,
          -1.2,
          angleRate,
          posx,
          posy,
          length / 2,
          counter - 1,
          lineWidth
        );
        this.animate(
          angleTo,
          1.2,
          angleRate,
          posx,
          posy,
          length / 2,
          counter - 1,
          lineWidth
        );
        posx += xmov / 2;
        posy += ymov / 2;
        this.animate(
          angleTo,
          -this.divergence2,
          angleRate,
          posx,
          posy,
          length,
          counter - 1,
          lineWidth
        );
        this.animate(
          angleTo,
          this.divergence2,
          angleRate,
          posx,
          posy,
          length,
          counter - 1,
          lineWidth
        );
      }
    }
    callAnimation() {
      for (let i = 0; i < branches; i++) {
        this.animate((offset = this.offset + (i * 6.28) / this.branches));
      }
    }
  }
};
doFractals();