// 自動載入文章
async function loadPosts() {
    try {
        const res = await fetch("data/posts.json");
        const posts = await res.json();
        const container = document.getElementById("posts-container");

        if (!container) return;

        posts.forEach(post => {
            const card = document.createElement("div");
            card.className = "post-card";

            card.innerHTML = `
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
        <div class="post-meta">${post.date} ｜ ${post.tag}</div>
      `;

            card.addEventListener("click", () => {
                window.location.href = post.link;
            });

            container.appendChild(card);
        });

    } catch (err) {
        console.error("文章載入失敗", err);
    }
}

loadPosts();
