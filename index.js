// Adressen på jeres REST API (kør backend med https-profilen i Visual Studio)
const baseUrl = "https://localhost:7118/api/musicrecords"
const loginUrl = "https://localhost:7118/api/auth/login"

Vue.createApp({
    data() {
        return {
            records: [],          // pladerne vi viser i tabellen
            searchTitle: "",
            searchArtist: "",
            username: "",
            password: "",
            token: null,          // JWT fra login. null = ikke logget ind
            loginMessage: "",
            message: "",
            isError: false,
            form: { title: "", artist: "", duration: 0, publicationYear: 2024 },
            editId: null          // null = tilføj ny, ellers id på pladen vi retter
        }
    },
    computed: {
        isLoggedIn() {
            return this.token !== null
        },
        // Headeren der sender vores JWT med til de beskyttede metoder
        authConfig() {
            return { headers: { Authorization: "Bearer " + this.token } }
        }
    },
    created() {
        // Hent pladerne når siden åbner
        this.getAll()
    },
    methods: {
        // ---------- LOGIN ----------
        async login() {
            try {
                const response = await axios.post(loginUrl, { username: this.username, password: this.password })
                this.token = response.data.token
                this.password = ""
                this.loginMessage = ""
            } catch (ex) {
                this.loginMessage = "Forkert brugernavn eller adgangskode"
            }
        },
        logout() {
            this.token = null
            this.cancelEdit()
            this.showMessage("Du er logget ud")
        },

        // ---------- READ (+ søgning) ----------
        async getAll() {
            try {
                const response = await axios.get(baseUrl, {
                    params: { titleStartsWith: this.searchTitle, artistStartsWith: this.searchArtist }
                })
                this.records = response.data
            } catch (ex) {
                this.showError(ex)
            }
        },

        // ---------- CREATE + UPDATE ----------
        async saveRecord() {
            if (this.editId === null) {
                await this.addRecord()
            } else {
                await this.updateRecord()
            }
        },
        async addRecord() {
            try {
                const response = await axios.post(baseUrl, this.form, this.authConfig)
                this.showMessage("Tilføjet: " + response.data.title + " (status " + response.status + ")")
                this.resetForm()
                await this.getAll()
            } catch (ex) {
                this.showError(ex)
            }
        },
        startEdit(record) {
            this.editId = record.id
            this.form = { ...record }   // kopi, så tabellen ikke ændres mens man skriver
        },
        async updateRecord() {
            try {
                const response = await axios.put(baseUrl + "/" + this.editId, this.form, this.authConfig)
                this.showMessage("Opdateret: " + response.data.title + " (status " + response.status + ")")
                this.cancelEdit()
                await this.getAll()
            } catch (ex) {
                this.showError(ex)
            }
        },
        cancelEdit() {
            this.editId = null
            this.resetForm()
        },
        resetForm() {
            this.form = { title: "", artist: "", duration: 0, publicationYear: 2024 }
        },

        // ---------- DELETE ----------
        async deleteRecord(id) {
            if (!confirm("Vil du slette plade " + id + "?")) {
                return
            }
            try {
                const response = await axios.delete(baseUrl + "/" + id, this.authConfig)
                this.showMessage("Slettet: " + response.data.title + " (status " + response.status + ")")
                if (this.editId === id) {
                    this.cancelEdit()
                }
                await this.getAll()
            } catch (ex) {
                this.showError(ex)
            }
        },

        // ---------- HJÆLPEMETODER ----------
        formatDuration(seconds) {
            const min = Math.floor(seconds / 60)
            const sec = seconds % 60
            return min + ":" + String(sec).padStart(2, "0")
        },
        showMessage(text) {
            this.isError = false
            this.message = text
        },
        showError(ex) {
            this.isError = true
            if (ex.response) {
                if (ex.response.status === 401) {
                    this.token = null   // token udløbet eller ugyldigt -> log ud
                    this.message = "Fejl 401: Du skal logge ind igen"
                } else {
                    this.message = "Fejl " + ex.response.status + " " + ex.response.statusText
                }
            } else {
                this.message = "Kunne ikke kontakte API'et (kører backend? CORS?): " + ex.message
            }
        }
    }
}).mount("#app")
