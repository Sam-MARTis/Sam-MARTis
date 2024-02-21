
const doChaos = () => {
  //Declaring some letiables and parameters
  let pause = 1;
  let unitVel = 100; //used to normalize pen velocity. normalvel = penvel/unitVel
  let ff = 0; //Boolean. fast forward
  let timeDelay = 1; //How quickly it draws lines
  // Getting html5 canvas ready
  let endMove = 0;
  let canvas = document.getElementById("canvas1");
  let button = document.getElementById("pauseButton");
  button.addEventListener("click", () => {
    pause = !pause;
  });
  let card1 = document.getElementById("chaos");
  let card2 = document.getElementById("fractal");
  let card3 = document.getElementById("flow");
  card1.addEventListener("click", () => {
    pause = 0;
  });
  card2.addEventListener("click", () => {
    pause = 1;
  });
  card3.addEventListener("click", () => {
    pause = 1;
  });

  let chaosContainerMine = document.getElementById("projectContainer");
  let c = canvas.getContext("2d");

  let containerWidth = chaosContainerMine.offsetWidth;
  let containerHeight = chaosContainerMine.offsetHeight;

  canvas.width = containerWidth * devicePixelRatio;
  canvas.height = containerHeight * devicePixelRatio;
  canvas.style.width = containerWidth + "px";
  canvas.style.height = containerHeight - 100 + "px";
  c.strokeStyle = "rgb(200, 0,0)";
  c.lineWidth = 1;

  // The below line is what resizes the graph to fit screensize in all devices.
  // let scaleFactor = Math.min(canvas.height / 968, canvas.width / 1260);
  let scaleFactor =((canvas.width, canvas.height/2))/500;

  //More letiables. r, g, b are declared to make a gradient depending on pen velocity
  let state = 2;
  let std_dt = 0.005; //Standard time-step
  let count = 0;
  let x = -7.13;
  let y = -7.11;
  let z = 25.41;
  let b = 0;
  let g = 0;
  let r = 0;
  let dt = 0.005; //Actual used time-step
  let a = Promise.resolve(); //Starts with a resolved promise. We do .then to draw the next movement of the pen.
  // Promises were painful to learn since I had never used them before.

  // Button click functions

  const clearScreen = () => {
    c.clearRect(0, 0, canvas.width, canvas.height);
  };
  const ffBut = () => {
    dt = std_dt / 2; //the smaller the dt, the more accurate

    ff = 1; //Command to fastforward
  };
  const reloadScreen = () => {
    endMove = 1;
    location.reload(); //reloads page when you press new
    clearScreen();
  };
  const speedUp = () => {
    dt = std_dt * 1.5; //this is what makes it speed up. however, this is slightly unstable
  };
  const slowDown = () => {
    dt = std_dt / 5;
  };
  const normalSpeed = () => {
    dt = std_dt;
  };

  let normalizeX = (x) => {
    return 0;
  };
  let normalizeY = (y) => {
    return 0;
  };

  c.beginPath();

  const command = (func, x, y, k) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        func(x, y, k);
        resolve();
      }, 1000);
    });
  };

  c.moveTo(window.innerWidth / 2, window.innerHeight / 2);

  let prev_pos = { x: normalizeX(y), y: normalizeY(z) };
  const move = (x, y, col) => {
    if (count == 1) {
      c.beginPath();
      c.strokeStyle = `rgb(${col.r}, 0, ${col.b})`;
      // c.strokeStyle = `rgb(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)})`;
      count = 0;
    } else {
      count = 1;
    }
    // console.log(x, y, z);
    c.moveTo(prev_pos.x, prev_pos.y);

    c.lineTo(x, y);
    c.stroke();
    c.moveTo(x, y);
    prev_pos.x = x;
    prev_pos.y = y;
  };

  //Declare placeholder functions
  let dxdt = (x, y, z) => {
    return 0;
  };
  let dydt = (x, y, z) => {
    return 0;
  };
  let dzdt = (x, y, z) => {
    return 0;
  };

  //Main function
  const proceed = (k) => {
    let count = 0;

    const animate = () => {
      if (count < k && pause == 0) {
        if (state === 0) {
          move(normalizeX(x), normalizeY(z), { r: r, g: g, b: b });
        }
        if (state === 1) {
          move(normalizeX(y) * 1.86 - normalizeX(x) * 0.86, normalizeY(z), {
            r: r,
            g: g,
            b: b,
          });
        }

        let dfxdt = dxdt(x, y, z);
        let dfydt = dydt(x, y, z);
        let dfzdt = dzdt(x, y, z);

        let vel = (dfxdt ** 2 + dfydt ** 2 + dfzdt ** 2) ** 0.5 / unitVel;
        r = Math.round(240 * vel);
        b = Math.round(240 * (1.5 - vel));

        x = x + dfxdt * dt;
        y = y + dfydt * dt;
        z = z + dfzdt * dt;

        count++; 
      }
      requestAnimationFrame(animate);
    };

    animate();
  };

  //Depending on which attractor is called, different normalization equations, differential equations and time steps are used
  const lorenz = () => {
    //Starting positions for lorenz attractor
    x = -7.13;
    y = -7.11;
    z = 25.41;
    let x_start = x;
    let y_start = y;
    let z_start = z;
    state = 0;

    std_dt = 0.004;
    dt = std_dt;
    unitVel = 100;
    normalizeX = (x) => {
      return canvas.width/ 2 + 30 * scaleFactor * (x-y_start -3);
    };
    normalizeY = (y) => {
      return canvas.height / 2 - 18 * scaleFactor * (y - z_start-6);
    };
    prev_pos = { x: normalizeX(y), y: normalizeY(z) };

    //Differential equations for lorenz attractor
    dxdt = (x, y, z) => {
      return 10 * (y - x);
    };
    dydt = (x, y, z) => {
      return x * (28 - z) - y;
    };
    dzdt = (x, y, z) => {
      return x * y - (8 * z) / 3;
    };

    proceed(Math.round(600000 * scaleFactor ** 0.2)); //Calls the main function with above delcared conditions.
  };
  const chen = () => {
    //Starting positions for chen attractor
    x = 1.96;
    
    y = 2.04;
    z = 12.51;
    let x_start = x;
    let y_start = y;
    let z_start = z;
    state = 0;

    std_dt = 0.0004; //Chen attractor is more sensitive
    dt = std_dt;
    unitVel = 1500;

    normalizeX = (x) => {
      return canvas.width/ 2 + 20 * scaleFactor * (x-x_start);
    };
    normalizeY = (y) => {
      return canvas.height / 2 - 20 * scaleFactor * (y-z_start -8);
    };
    prev_pos = { x: normalizeX(x), y: normalizeY(z) };

    //Differential equations for chen attractor
    dxdt = (x, y, z) => {
      return 400 * (y - x);
    };
    dydt = (x, y, z) => {
      return -120 * x - 10 * (x * z) + 280 * y;
    };
    dzdt = (x, y, z) => {
      return 10 * x * y - 30 * z;
    };

    proceed(Math.round(200000 * scaleFactor ** 0.2)); //Calls the main function with above delcared conditions.
  };
  const halvorsen = () => {
    console.log("Doing halvorsen...");
    // x= -5.48;
    // y= -4.51;
    // z= 1.04;
    x = -1.48;
    y = -1.51;
    z = 2.04;
    let x_start = x;
    let y_start = y;
    let z_start = z;
    state = 1;

    std_dt = 0.001; //Chen attractor is more sensitive
    dt = std_dt;
    unitVel = 60;

    normalizeX = (t) => {
      return canvas.width/ (2) + 10 * scaleFactor * (t -y_start);
    };
    normalizeY = (t) => {
      return canvas.height / (2 ) - 20 * scaleFactor * (t -z_start);
    };
    prev_pos = { x: normalizeX(y), y: normalizeY(z) };

    let alpha = 1.4;
    dxdt = (x, y, z) => {
      return -(alpha * x) - 4 * y - 4 * z - y ** 2;
    };
    dydt = (x, y, z) => {
      return -(alpha * y) - 4 * z - 4 * x - z ** 2;
    };
    dzdt = (x, y, z) => {
      return -(alpha * z) - 4 * x - 4 * y - x ** 2;
    };

    proceed(Math.round(900000 * scaleFactor ** 0.2));
  };
  const incSpeed = () => {
    speedUp();
    speedUp();
    speedUp();
    speedUp();
    speedUp();
    speedUp();
    speedUp();
    speedUp();
  }
 const lorenzDo = () => {
   clearScreen();
   normalSpeed();
   lorenz();
   // speedUp();
   setTimeout(() => {
     clearScreen();
     incSpeed();
   }, 50);
 };
  document.getElementById("lorenz").addEventListener("click", lorenzDo);

  document.getElementById("chen").addEventListener("click", () => {
    clearScreen();
    normalSpeed();
    chen();
    // speedUp();
    setTimeout(() => {
      clearScreen();
      incSpeed();
    }, 50);
  });
  document.getElementById("halvorsen").addEventListener("click", () => {
    clearScreen();
    normalSpeed();
    halvorsen();
    // speedUp();
    setTimeout(() => {
      clearScreen();
      incSpeed();
    }, 50);
  });


  lorenz();
  for (let i = 0; i < 10; i++){
    lorenzDo()
  }
};
window.addEventListener("load", () => {
  doChaos();
});
