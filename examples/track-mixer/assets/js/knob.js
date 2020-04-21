function knob(inputElement, radialElement, options) {
    options = Object.assign({
        rangeInDegrees: 360,
        rangeStartDegree: 0,
        valueRangeStart: parseFloat(inputElement.getAttribute("min")) || 0,
        valueRangeEnd: parseFloat(inputElement.getAttribute("max")) || 100,
        defaultValue: parseFloat(inputElement.getAttribute("value")) || 0
    }, options);

    let elementBB;
    let elementCenter;

    let { rangeInDegrees,
        rangeStartDegree,
        valueRangeStart,
        valueRangeEnd } = options;

    let value = options.defaultValue;

    let startPoint;
    let startDegree;
    let startValue;
    let degreeDelta;
    let mouseDown;
    let previousDegree;
    let revolutions;

    update();
    updateBB();

    function update(){
        if (options.onUpdate){
            options.onUpdate(value, {
                progress: value/(valueRangeEnd-valueRangeStart)
            })
        } else {
            defaultUpdateUI();
        }
    }


    function updateBB(){
        elementBB = radialElement.getBoundingClientRect();
        elementCenter= {
            x: elementBB.x + elementBB.width / 2,
            y: elementBB.y + elementBB.height / 2
        }
    }

    function updateValue(newValue) {
        value = Math.min(Math.max(newValue, valueRangeStart), valueRangeEnd);
    }

    function defaultUpdateUI() {
        let degrees = value / (valueRangeEnd - valueRangeStart) * rangeInDegrees + rangeStartDegree;
        radialElement.style.transform = `rotate(${degrees}deg)`;
    }

    function getDegrees(x, y) {
        let angle = Math.atan2(y - elementCenter.y, x - elementCenter.x);
        let angleInDegrees = (angle * 180 / Math.PI + 360) % 360;
        return angleInDegrees;
    }

    window.addEventListener('mousemove', e => {
        if (mouseDown) {
            let currentDegree = getDegrees(e.clientX, e.clientY);
            if (currentDegree - previousDegree > 300) {
                revolutions -= 1;
            } else if (currentDegree - previousDegree < -300) {
                revolutions += 1;
            }
            let wrappedDegree = currentDegree + revolutions * 360;
            degreeDelta = wrappedDegree - startDegree;

            // console.log(degreeDelta);

            valueDelta = degreeDelta / rangeInDegrees * (valueRangeEnd - valueRangeStart);
            updateValue(startValue + valueDelta);
            update();

            previousDegree = currentDegree;
            e.preventDefault();
        }
    })

    radialElement.addEventListener('click', e => {
        if (typeof degreeDelta === 'undefined' || degreeDelta === null){
            let degree = getDegrees(e.clientX, e.clientY);
            // degree relative to the rangeStartDegree
            let relativeDegree = norrmalizeDegree(degree + rangeStartDegree);
            newValue = relativeDegree / rangeInDegrees * (valueRangeEnd - valueRangeStart) + valueRangeStart;
            updateValue(newValue);
            update();
            e.preventDefault();
        }
    });

    radialElement.addEventListener('mousedown', e => {
        mouseDown = true;
        startPoint = {
            x: e.clientX,
            y: e.clientY
        }
        startDegree = getDegrees(startPoint.x, startPoint.y);
        startValue = value;
        revolutions = 0;
    });

    window.addEventListener('mouseup', e => {
        mouseDown = false;
        startPoint = null;
        startValue = null;
        revolutions = null;

        setTimeout(()=>{
            degreeDelta = null;
        }, 200);
    });

    radialElement.addEventListener('wheel', e => {
        let ticks = (valueRangeEnd - valueRangeStart) / 50;
        let newValue = value + e.deltaY * -0.01 * ticks;
        updateValue(newValue);
        update();

        e.preventDefault();
    });

    inputElement.addEventListener('change', e =>{
        value = parseFloat(inputElement.value);
        update();
    })

    function norrmalizeDegree(deg){
        while(deg>360){
            deg-=360;
        }
        while(deg<0){
            deg+=360;
        }
        return deg;
    }

}