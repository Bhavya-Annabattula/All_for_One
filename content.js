// Runs inside every webpage. Job: grab clean, readable text when asked.
console.log("content script loaded, chrome.runtime:", chrome.runtime);

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

function getPageMeta() {
    return {
        title: document.title,
        url: window.location.href,
        text: getPageText()
    };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === "GET_PAGE_CONTENT") {
        sendResponse(getPageMeta());
        return;
    }

    if (message.type === "TOGGLE_AVATAR") {
        const existing = document.getElementById("aio-avatar");

        if (message.enabled) {
            if (!existing) createAvatar();
        } else {
            if (existing) existing.remove();
        }

        return;
    }

    if (message.type === "SET_AVATAR_CHARACTER") {

        // Change the selected character
        currentCharacter = message.character || "cat";

        // Save the selected character
        chrome.storage.local.set({
            avatarCharacter: currentCharacter
        });

        const existing = document.getElementById("aio-avatar");

        if (existing) {

            // Keep follow state
            const wasFollowing = avatarState.following;

            // Keep current position
            const rect = existing.getBoundingClientRect();

            existing.remove();

            createAvatar();

            const newAvatar =
                document.getElementById("aio-avatar");

            if (newAvatar) {

                newAvatar.style.left =
                    rect.left + "px";

                newAvatar.style.top =
                    rect.top + "px";

                newAvatar.style.right = "auto";
                newAvatar.style.bottom = "auto";

                avatarState.following =
                    wasFollowing;
            }
        }

        return;
    }
});


// ============================================================
// Floating AI Avatar
// ============================================================

// Currently selected character
let currentCharacter = "cat";

// Follow state
const avatarState = {
    following: false
};


// ============================================================
// CHARACTER IMAGES
// ============================================================

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
// CREATE AVATAR
// ============================================================

function createAvatar() {

    if (document.getElementById("aio-avatar")) {
        return;
    }

    // Get saved character
    chrome.storage.local.get(
        ["avatarCharacter"],
        (result) => {

            currentCharacter =
                result.avatarCharacter || "cat";

            buildAvatarElement();
        }
    );
}


// ============================================================
// BUILD AVATAR ELEMENT
// ============================================================

function buildAvatarElement() {

    if (document.getElementById("aio-avatar")) {
        return;
    }

    const character =
        CHARACTERS[currentCharacter] ||
        CHARACTERS.cat;


    // ========================================================
    // MAIN AVATAR
    // ========================================================

    const avatar =
        document.createElement("div");

    avatar.id = "aio-avatar";


    // ========================================================
    // CHARACTER IMAGE
    // ========================================================

    const characterImage =
        document.createElement("img");

    characterImage.src =
        chrome.runtime.getURL(character.image);

    characterImage.alt =
        currentCharacter + " AI Assistant";


    Object.assign(characterImage.style, {

        width: "100%",

        height: "100%",

        objectFit: "contain",

        display: "block",

        pointerEvents: "none",

        transformOrigin: "center bottom",

        transition:
            "transform 0.18s ease"

    });


    avatar.appendChild(characterImage);


    // ========================================================
    // AVATAR CONTAINER
    // ========================================================

    Object.assign(avatar.style, {

        position: "fixed",

        width: "110px",

        height: "110px",

        cursor: "pointer",

        zIndex: "2147483647",

        userSelect: "none",

        right: "20px",

        bottom: "15px",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        background: "transparent",

        border: "none",

        padding: "0",

        margin: "0"

    });


    document.body.appendChild(avatar);


    // ========================================================
    // IDLE BOB ANIMATION
    // ========================================================

    let floatAngle = 0;

    const bobInterval =
        setInterval(() => {

            if (!document.getElementById("aio-avatar")) {

                clearInterval(bobInterval);

                return;
            }

            floatAngle += 0.05;

            const bob =
                Math.sin(floatAngle) * 4;

            avatar.style.transform =
                `translateY(${bob}px)`;

        }, 30);


    // ========================================================
    // FOLLOW CURSOR
    // ========================================================

    let mouseX =
        window.innerWidth / 2;

    let mouseY =
        window.innerHeight / 2;

    let avatarX =
        window.innerWidth - 94;

    let avatarY =
        window.innerHeight - 94;


    document.addEventListener("mousemove", (e) => {

        mouseX = e.clientX;

        mouseY = e.clientY;

    });


    function followLoop() {

        if (!document.getElementById("aio-avatar")) {
            return;
        }

        if (avatarState.following) {

            avatarX +=
                (mouseX + 24 - avatarX) * 0.08;

            avatarY +=
                (mouseY + 24 - avatarY) * 0.08;

            avatar.style.left =
                avatarX + "px";

            avatar.style.top =
                avatarY + "px";

            avatar.style.right = "auto";

            avatar.style.bottom = "auto";
        }

        requestAnimationFrame(followLoop);
    }


    followLoop();


    // ========================================================
    // HOVER REACTION
    // ========================================================

    avatar.addEventListener("mouseenter", () => {

        characterImage.style.transform =
            "scale(1.12) translateY(-5px)";

    });


    avatar.addEventListener("mouseleave", () => {

        characterImage.style.transform =
            "scale(1)";

    });


    // ========================================================
    // CLICK REACTION
    // ========================================================

    avatar.addEventListener("click", () => {

        characterImage.style.transform =
            "scaleX(1.18) scaleY(0.82) translateY(5px)";


        setTimeout(() => {

            characterImage.style.transform =
                "scaleX(0.9) scaleY(1.08) translateY(-4px)";

        }, 100);


        setTimeout(() => {

            characterImage.style.transform =
                "scale(1)";

        }, 220);

    });


    // ========================================================
    // DOUBLE CLICK = TOGGLE FOLLOW MODE
    // ========================================================

    avatar.addEventListener("dblclick", () => {

        avatarState.following =
            !avatarState.following;


        if (!avatarState.following) {

            avatarX =
                parseFloat(avatar.style.left) ||
                avatarX;

            avatarY =
                parseFloat(avatar.style.top) ||
                avatarY;
        }

    });

}


// ============================================================
// CHECK WHETHER AVATAR IS ENABLED
// ============================================================

chrome.storage.local.get(
    ["avatarEnabled"],
    (result) => {

        if (result.avatarEnabled === true) {

            createAvatar();

        }

    }
);
