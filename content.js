// ============================================================
// ALL FOR ONE - CONTENT SCRIPT
// ============================================================

// Runs inside every webpage.
console.log("content script loaded, chrome.runtime:", chrome.runtime);


// ============================================================
// PAGE TEXT
// ============================================================

function getPageText() {
    const clone = document.body.cloneNode(true);

    const junkSelectors = [
        "script",
        "style",
        "noscript",
        "nav",
        "footer",
        "svg"
    ];

    junkSelectors.forEach(sel => {
        clone.querySelectorAll(sel).forEach(el => el.remove());
    });

    const text = clone.innerText || clone.textContent || "";

    return text.replace(/\s+/g, " ").trim();
}


// ============================================================
// PAGE META
// ============================================================

function getPageMeta() {
    return {
        title: document.title,
        url: window.location.href,
        text: getPageText()
    };
}


// ============================================================
// AVATAR STATE
// ============================================================

const avatarState = {

    // Current behavior
    mode: "roam",

    // Whether pet is sleeping
    sleeping: false,

    // Whether pet exists
    enabled: true

};


// ============================================================
// CHARACTER SELECTION
// ============================================================

let currentCharacter = "cat";


const CHARACTERS = {

    fox: {
        image: "fox-character.png"
    },

    cat: {
        image: "cat-character.png"
    },

    penguin: {
        image: "penguin-character.png"
    }

};


// ============================================================
// PET MOVEMENT STATE
// ============================================================

let petX = 0;
let petY = 0;

let targetX = 0;
let targetY = 0;

let velocityX = 0;
let velocityY = 0;

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

let petAnimationFrame = null;
let roamTimer = null;

let petInitialized = false;


// ============================================================
// MESSAGE LISTENER
// ============================================================

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {


        // ----------------------------------------------------
        // GET PAGE CONTENT
        // ----------------------------------------------------

        if (message.type === "GET_PAGE_CONTENT") {

            sendResponse(getPageMeta());

            return;
        }


        // ----------------------------------------------------
        // TOGGLE AVATAR
        // ----------------------------------------------------

        if (message.type === "TOGGLE_AVATAR") {

            const existing =
                document.getElementById("aio-avatar");


            if (message.enabled) {

                if (!existing) {
                    createAvatar();
                }

            } else {

                removeAvatar();

            }

            return;
        }


        // ----------------------------------------------------
        // CHANGE CHARACTER
        // ----------------------------------------------------

        if (message.type === "SET_AVATAR_CHARACTER") {

            const newCharacter =
                message.character || "cat";


            if (!CHARACTERS[newCharacter]) {
                return;
            }


            currentCharacter =
                newCharacter;


            chrome.storage.local.set({
                avatarCharacter: currentCharacter
            });


            const existing =
                document.getElementById("aio-avatar");


            if (existing) {

                // Keep current position
                const rect =
                    existing.getBoundingClientRect();


                // Keep current mode
                const oldMode =
                    avatarState.mode;


                // Remove old pet
                removeAvatar();


                // Create new pet
                createAvatar();


                const newAvatar =
                    document.getElementById("aio-avatar");


                if (newAvatar) {

                    petX = rect.left;
                    petY = rect.top;

                    targetX = petX;
                    targetY = petY;

                    newAvatar.style.left =
                        petX + "px";

                    newAvatar.style.top =
                        petY + "px";
                }


                avatarState.mode =
                    oldMode;
            }

            return;
        }

    }
);


// ============================================================
// CREATE AVATAR
// ============================================================

function createAvatar() {

    if (document.getElementById("aio-avatar")) {
        return;
    }


    chrome.storage.local.get(
        ["avatarCharacter"],
        (result) => {

            currentCharacter =
                result.avatarCharacter || "cat";


            if (!CHARACTERS[currentCharacter]) {
                currentCharacter = "cat";
            }


            buildAvatarElement();

        }
    );
}


// ============================================================
// REMOVE AVATAR
// ============================================================

function removeAvatar() {

    const existing =
        document.getElementById("aio-avatar");


    if (existing) {
        existing.remove();
    }


    if (roamTimer) {

        clearTimeout(roamTimer);

        roamTimer = null;
    }


    if (petAnimationFrame) {

        cancelAnimationFrame(
            petAnimationFrame
        );

        petAnimationFrame = null;
    }


    petInitialized = false;
}


// ============================================================
// BUILD PET
// ============================================================

function buildAvatarElement() {

    if (document.getElementById("aio-avatar")) {
        return;
    }


    const character =
        CHARACTERS[currentCharacter];


    // ========================================================
    // PET CONTAINER
    // ========================================================

    const avatar =
        document.createElement("div");


    avatar.id =
        "aio-avatar";


    // ========================================================
    // PET IMAGE
    // ========================================================

    const petImage =
        document.createElement("img");


    petImage.src =
        chrome.runtime.getURL(
            character.image
        );


    petImage.alt =
        currentCharacter +
        " AI pet";


    Object.assign(
        petImage.style,
        {

            width: "100%",

            height: "100%",

            objectFit: "contain",

            display: "block",

            pointerEvents: "none",

            userSelect: "none",

            transformOrigin:
                "center bottom",

            transition:
                "transform 0.2s ease"

        }
    );


    avatar.appendChild(
        petImage
    );


    // ========================================================
    // PET SIZE / POSITION
    // ========================================================

    Object.assign(
        avatar.style,
        {

            position: "fixed",

            width: "105px",

            height: "105px",

            left: "0px",

            top: "0px",

            zIndex:
                "2147483647",

            cursor: "pointer",

            userSelect: "none",

            pointerEvents: "auto",

            background:
                "transparent",

            border: "none",

            padding: "0",

            margin: "0"

        }
    );


    document.body.appendChild(
        avatar
    );


    // ========================================================
    // STARTING POSITION
    // ========================================================

    const margin = 25;


    petX =
        Math.max(
            margin,
            window.innerWidth - 140
        );


    petY =
        Math.max(
            margin,
            window.innerHeight - 150
        );


    targetX = petX;
    targetY = petY;


    avatar.style.left =
        petX + "px";


    avatar.style.top =
        petY + "px";


    petInitialized =
        true;


    // ========================================================
    // MOUSE TRACKING
    // ========================================================

    document.addEventListener(
        "mousemove",
        handleMouseMove
    );


    // ========================================================
    // HOVER
    // ========================================================

    avatar.addEventListener(
        "mouseenter",
        () => {

            if (avatarState.sleeping) {
                return;
            }


            petImage.style.transform =
                "scale(1.12) translateY(-6px)";


            // Stop roaming temporarily
            // when user is interacting.

            if (
                avatarState.mode === "roam"
            ) {

                targetX = petX;
                targetY = petY;
            }

        }
    );


    avatar.addEventListener(
        "mouseleave",
        () => {

            if (avatarState.sleeping) {
                return;
            }


            petImage.style.transform =
                "scale(1)";

        }
    );


    // ========================================================
    // CLICK REACTION
    // ========================================================

    avatar.addEventListener(
        "click",
        () => {

            if (avatarState.sleeping) {

                wakePet();

                return;
            }


            petReaction(
                petImage
            );

        }
    );


    // ========================================================
    // DOUBLE CLICK = FOLLOW
    // ========================================================

    avatar.addEventListener(
        "dblclick",
        (event) => {

            event.preventDefault();
            event.stopPropagation();


            if (
                avatarState.mode ===
                "follow"
            ) {

                setPetMode("roam");

            } else {

                setPetMode("follow");

            }

        }
    );


    // ========================================================
    // RIGHT CLICK = PET MENU
    // ========================================================

    avatar.addEventListener(
        "contextmenu",
        (event) => {

            event.preventDefault();
            event.stopPropagation();


            showPetMenu(
                event.clientX,
                event.clientY
            );

        }
    );


    // ========================================================
    // START PET ANIMATION
    // ========================================================

    startPetAnimation();


    // ========================================================
    // START ROAMING
    // ========================================================

    scheduleNextRoam();


    // ========================================================
    // ADD SMALL IDLE ANIMATION
    // ========================================================

    startIdleAnimation(
        petImage
    );
}


// ============================================================
// MOUSE MOVE
// ============================================================

function handleMouseMove(event) {

    mouseX =
        event.clientX;

    mouseY =
        event.clientY;

}


// ============================================================
// PET REACTION
// ============================================================

function petReaction(image) {

    image.style.transition =
        "transform 0.1s ease";


    // Squish

    image.style.transform =
        "scaleX(1.18) scaleY(0.82)";


    setTimeout(() => {

        if (!document.getElementById("aio-avatar")) {
            return;
        }


        image.style.transform =
            "scaleX(0.9) scaleY(1.1)";

    }, 110);


    setTimeout(() => {

        if (!document.getElementById("aio-avatar")) {
            return;
        }


        image.style.transform =
            "scale(1)";

    }, 240);

}


// ============================================================
// PET IDLE ANIMATION
// ============================================================

function startIdleAnimation(image) {

    let angle = 0;


    function idleLoop() {

        if (
            !document.getElementById(
                "aio-avatar"
            )
        ) {
            return;
        }


        if (
            avatarState.sleeping
        ) {

            image.style.transform =
                "scale(0.95)";

        } else {

            angle += 0.04;


            const bob =
                Math.sin(angle) * 2;


            // Only apply subtle bobbing
            // when pet isn't reacting.

            if (
                !image.matches(":hover")
            ) {

                image.style.transform =
                    `translateY(${bob}px)`;
            }

        }


        requestAnimationFrame(
            idleLoop
        );
    }


    idleLoop();
}


// ============================================================
// PET MOVEMENT
// ============================================================

function startPetAnimation() {

    function animate() {

        const avatar =
            document.getElementById(
                "aio-avatar"
            );


        if (!avatar) {
            return;
        }


        if (
            !avatarState.sleeping
        ) {


            // =================================================
            // FOLLOW CURSOR
            // =================================================

            if (
                avatarState.mode ===
                "follow"
            ) {

                targetX =
                    mouseX -
                    45;

                targetY =
                    mouseY -
                    55;
            }


            // =================================================
            // MOVE TOWARD TARGET
            // =================================================

            const dx =
                targetX - petX;

            const dy =
                targetY - petY;


            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            if (distance > 2) {

                const speed =
                    avatarState.mode ===
                    "follow"
                        ? 0.13
                        : 0.035;


                velocityX =
                    dx * speed;

                velocityY =
                    dy * speed;


                petX +=
                    velocityX;

                petY +=
                    velocityY;


                // =================================================
                // KEEP PET INSIDE SCREEN
                // =================================================

                const maxX =
                    window.innerWidth -
                    avatar.offsetWidth -
                    10;


                const maxY =
                    window.innerHeight -
                    avatar.offsetHeight -
                    10;


                petX =
                    Math.max(
                        10,
                        Math.min(
                            petX,
                            maxX
                        )
                    );


                petY =
                    Math.max(
                        10,
                        Math.min(
                            petY,
                            maxY
                        )
                    );


                avatar.style.left =
                    petX + "px";


                avatar.style.top =
                    petY + "px";


                // =================================================
                // FACE MOVEMENT DIRECTION
                // =================================================

                const image =
                    avatar.querySelector(
                        "img"
                    );


                if (image) {

                    if (
                        velocityX > 0.2
                    ) {

                        image.style.transform =
                            "scaleX(1)";

                    } else if (
                        velocityX < -0.2
                    ) {

                        image.style.transform =
                            "scaleX(-1)";

                    }

                }

            }

        }


        petAnimationFrame =
            requestAnimationFrame(
                animate
            );
    }


    animate();
}


// ============================================================
// RANDOM ROAMING
// ============================================================

function scheduleNextRoam() {

    if (roamTimer) {

        clearTimeout(
            roamTimer
        );
    }


    // Don't roam if following
    // or sleeping.

    if (
        avatarState.mode !== "roam" ||
        avatarState.sleeping
    ) {

        roamTimer =
            setTimeout(
                scheduleNextRoam,
                1500
            );

        return;
    }


    // Wait between movements.

    const wait =
        2500 +
        Math.random() * 3500;


    roamTimer =
        setTimeout(
            () => {

                chooseRandomTarget();

                scheduleNextRoam();

            },
            wait
        );
}


// ============================================================
// RANDOM TARGET
// ============================================================

function chooseRandomTarget() {

    const avatar =
        document.getElementById(
            "aio-avatar"
        );


    if (!avatar) {
        return;
    }


    const width =
        avatar.offsetWidth;


    const height =
        avatar.offsetHeight;


    const padding =
        20;


    targetX =
        padding +
        Math.random() *
        Math.max(
            1,
            window.innerWidth -
            width -
            padding * 2
        );


    targetY =
        padding +
        Math.random() *
        Math.max(
            1,
            window.innerHeight -
            height -
            padding * 2
        );

}


// ============================================================
// CHANGE PET MODE
// ============================================================

function setPetMode(mode) {

    avatarState.mode =
        mode;


    const avatar =
        document.getElementById(
            "aio-avatar"
        );


    if (!avatar) {
        return;
    }


    const image =
        avatar.querySelector(
            "img"
        );


    // ========================================================
    // FOLLOW
    // ========================================================

    if (mode === "follow") {

        targetX =
            mouseX - 45;

        targetY =
            mouseY - 55;


        if (image) {

            image.style.transform =
                "scale(1.08)";

        }

    }


    // ========================================================
    // ROAM
    // ========================================================

    if (mode === "roam") {

        chooseRandomTarget();


        if (image) {

            image.style.transform =
                "scale(1)";

        }


        scheduleNextRoam();

    }


    // ========================================================
    // STAY
    // ========================================================

    if (mode === "stay") {

        targetX =
            petX;

        targetY =
            petY;


        if (image) {

            image.style.transform =
                "scale(1)";

        }

    }

}


// ============================================================
// SLEEP
// ============================================================

function sleepPet() {

    avatarState.sleeping =
        true;


    avatarState.mode =
        "stay";


    const avatar =
        document.getElementById(
            "aio-avatar"
        );


    if (!avatar) {
        return;
    }


    const image =
        avatar.querySelector(
            "img"
        );


    if (image) {

        image.style.transform =
            "scale(0.88) translateY(8px)";

        image.style.opacity =
            "0.85";

    }

}


// ============================================================
// WAKE
// ============================================================

function wakePet() {

    avatarState.sleeping =
        false;


    avatarState.mode =
        "roam";


    const avatar =
        document.getElementById(
            "aio-avatar"
        );


    if (!avatar) {
        return;
    }


    const image =
        avatar.querySelector(
            "img"
        );


    if (image) {

        image.style.opacity =
            "1";


        image.style.transform =
            "scale(1.1) translateY(-8px)";


        setTimeout(() => {

            image.style.transform =
                "scale(1)";

        }, 350);

    }


    chooseRandomTarget();

    scheduleNextRoam();

}


// ============================================================
// PET MENU
// ============================================================

function showPetMenu(x, y) {

    // Remove existing menu

    const oldMenu =
        document.getElementById(
            "aio-pet-menu"
        );


    if (oldMenu) {
        oldMenu.remove();
    }


    // ========================================================
    // MENU
    // ========================================================

    const menu =
        document.createElement("div");


    menu.id =
        "aio-pet-menu";


    Object.assign(
        menu.style,
        {

            position: "fixed",

            left: x + "px",

            top: y + "px",

            width: "190px",

            padding: "8px",

            background:
                "rgba(255,255,255,0.98)",

            border:
                "1px solid rgba(0,0,0,0.12)",

            borderRadius: "14px",

            boxShadow:
                "0 8px 30px rgba(0,0,0,0.20)",

            zIndex:
                "2147483647",

            fontFamily:
                "Arial, sans-serif",

            color: "#222",

            userSelect: "none"

        }
    );


    // ========================================================
    // TITLE
    // ========================================================

    const title =
        document.createElement("div");


    title.textContent =
        currentCharacter
            .charAt(0)
            .toUpperCase() +
        currentCharacter.slice(1);


    Object.assign(
        title.style,
        {

            padding:
                "7px 10px",

            fontWeight:
                "bold",

            fontSize:
                "14px",

            borderBottom:
                "1px solid #eee",

            marginBottom:
                "5px"

        }
    );


    menu.appendChild(title);


    // ========================================================
    // MENU ITEM HELPER
    // ========================================================

    function addMenuItem(
        text,
        callback
    ) {

        const item =
            document.createElement("div");


        item.textContent =
            text;


        Object.assign(
            item.style,
            {

                padding:
                    "9px 10px",

                borderRadius:
                    "9px",

                cursor:
                    "pointer",

                fontSize:
                    "13px",

                transition:
                    "background 0.15s ease"

            }
        );


        item.addEventListener(
            "mouseenter",
            () => {

                item.style.background =
                    "#f1f1f1";

            }
        );


        item.addEventListener(
            "mouseleave",
            () => {

                item.style.background =
                    "transparent";

            }
        );


        item.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                callback();

                menu.remove();

            }
        );


        menu.appendChild(item);

    }


    // ========================================================
    // FOLLOW
    // ========================================================

    addMenuItem(
        "Follow me",
        () => {

            setPetMode("follow");

        }
    );


    // ========================================================
    // STAY
    // ========================================================

    addMenuItem(
        "Stay here",
        () => {

            setPetMode("stay");

        }
    );


    // ========================================================
    // ROAM
    // ========================================================

    addMenuItem(
        "Roam around",
        () => {

            setPetMode("roam");

        }
    );


    // ========================================================
    // SLEEP / WAKE
    // ========================================================

    addMenuItem(
        avatarState.sleeping
            ? "Wake up"
            : "Go to sleep",

        () => {

            if (
                avatarState.sleeping
            ) {

                wakePet();

            } else {

                sleepPet();

            }

        }
    );


    // ========================================================
    // SWITCH CHARACTER
    // ========================================================

    addMenuItem(
        "Switch character",
        () => {

            showCharacterMenu(
                x,
                y
            );

        }
    );


    // ========================================================
    // ADD MENU TO PAGE
    // ========================================================

    document.body.appendChild(
        menu
    );


    // ========================================================
    // KEEP MENU ON SCREEN
    // ========================================================

    const rect =
        menu.getBoundingClientRect();


    if (
        rect.right >
        window.innerWidth
    ) {

        menu.style.left =
            (window.innerWidth -
             rect.width -
             10) + "px";

    }


    if (
        rect.bottom >
        window.innerHeight
    ) {

        menu.style.top =
            (window.innerHeight -
             rect.height -
             10) + "px";

    }


    // Close menu when clicking elsewhere

    setTimeout(() => {

        document.addEventListener(
            "click",
            function closeMenu(event) {

                if (
                    !menu.contains(event.target)
                ) {

                    menu.remove();

                    document.removeEventListener(
                        "click",
                        closeMenu
                    );
                }

            }
        );

    }, 0);

}


// ============================================================
// CHARACTER MENU
// ============================================================

function showCharacterMenu(x, y) {

    const oldMenu =
        document.getElementById(
            "aio-character-menu"
        );


    if (oldMenu) {
        oldMenu.remove();
    }


    const menu =
        document.createElement("div");


    menu.id =
        "aio-character-menu";


    Object.assign(
        menu.style,
        {

            position: "fixed",

            left: x + "px",

            top: y + "px",

            width: "180px",

            padding: "8px",

            background:
                "rgba(255,255,255,0.98)",

            border:
                "1px solid rgba(0,0,0,0.12)",

            borderRadius: "14px",

            boxShadow:
                "0 8px 30px rgba(0,0,0,0.20)",

            zIndex:
                "2147483647",

            fontFamily:
                "Arial, sans-serif",

            color: "#222"

        }
    );


    const title =
        document.createElement("div");


    title.textContent =
        "Choose your pet";


    Object.assign(
        title.style,
        {

            padding:
                "7px 10px",

            fontWeight:
                "bold",

            fontSize:
                "14px",

            borderBottom:
                "1px solid #eee",

            marginBottom:
                "5px"

        }
    );


    menu.appendChild(title);


    // ========================================================
    // CHARACTER OPTIONS
    // ========================================================

    const names = [
        "fox",
        "cat",
        "penguin"
    ];


    names.forEach(
        (name) => {

            const item =
                document.createElement("div");


            item.textContent =
                name
                    .charAt(0)
                    .toUpperCase() +
                name.slice(1);


            Object.assign(
                item.style,
                {

                    padding:
                        "9px 10px",

                    borderRadius:
                        "9px",

                    cursor:
                        "pointer",

                    fontSize:
                        "13px"

                }
            );


            item.addEventListener(
                "mouseenter",
                () => {

                    item.style.background =
                        "#f1f1f1";

                }
            );


            item.addEventListener(
                "mouseleave",
                () => {

                    item.style.background =
                        "transparent";

                }
            );


            item.addEventListener(
                "click",
                () => {

                    changeCharacter(
                        name
                    );


                    menu.remove();

                }
            );


            menu.appendChild(
                item
            );

        }
    );


    document.body.appendChild(
        menu
    );


    // Keep inside screen

    const rect =
        menu.getBoundingClientRect();


    if (
        rect.right >
        window.innerWidth
    ) {

        menu.style.left =
            (window.innerWidth -
             rect.width -
             10) + "px";

    }


    if (
        rect.bottom >
        window.innerHeight
    ) {

        menu.style.top =
            (window.innerHeight -
             rect.height -
             10) + "px";

    }

}


// ============================================================
// CHANGE CHARACTER
// ============================================================

function changeCharacter(
    character
) {

    if (
        !CHARACTERS[character]
    ) {
        return;
    }


    currentCharacter =
        character;


    chrome.storage.local.set({
        avatarCharacter:
            currentCharacter
    });


    const avatar =
        document.getElementById(
            "aio-avatar"
        );


    if (!avatar) {
        return;
    }


    const image =
        avatar.querySelector(
            "img"
        );


    if (!image) {
        return;
    }


    image.style.transform =
        "scale(0.7)";


    setTimeout(() => {

        image.src =
            chrome.runtime.getURL(
                CHARACTERS[
                    currentCharacter
                ].image
            );


        image.alt =
            currentCharacter +
            " AI pet";


        image.style.transform =
            "scale(1.1)";


        setTimeout(() => {

            image.style.transform =
                "scale(1)";

        }, 200);

    }, 120);

}


// ============================================================
// WINDOW RESIZE
// ============================================================

window.addEventListener(
    "resize",
    () => {

        const avatar =
            document.getElementById(
                "aio-avatar"
            );


        if (!avatar) {
            return;
        }


        const maxX =
            window.innerWidth -
            avatar.offsetWidth -
            10;


        const maxY =
            window.innerHeight -
            avatar.offsetHeight -
            10;


        petX =
            Math.max(
                10,
                Math.min(
                    petX,
                    maxX
                )
            );


        petY =
            Math.max(
                10,
                Math.min(
                    petY,
                    maxY
                )
            );


        avatar.style.left =
            petX + "px";


        avatar.style.top =
            petY + "px";

    }
);


// ============================================================
// START AVATAR IF ENABLED
// ============================================================

chrome.storage.local.get(
    ["avatarEnabled"],
    (result) => {

        if (
            result.avatarEnabled === true
        ) {

            createAvatar();

        }

    }
);
