const  { hash, compare } = require("bcryptjs")
const AppError = require("../utils/AppError");

const sqliteConnection = require("../database/sqlite");

class UsersController {
  /*
    index - GET para listrar vários registros
    show - GET para exibir um registro especifico
    create - POST para criar um registro
    update - PUT para atualizar um registro
    delete - DELETE para remover um registro
  */

  async create(request, response) {
    const { name, email, password } = request.body;

    const database = await sqliteConnection();
    const checkUserExists = await database.get("SELECT * FROM users WHERE email = (?)", [email])

    if (checkUserExists) {
      throw new AppError("Este e-mail já está em uso.")
    }

    const hashedPassword = await hash(password, 8); //nivel 8 mas pode ser mais complexo
    // usa o await porque o hash é uma promisse, entao tem q esperar ele terminar de gerar
    // para ver se é promisse só deixa o mouse em cima

    await database.run(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [ name, email, hashedPassword ]
    );

    return response.status(201).json();
    // if(!name) {
    //   throw new AppError("O nome é obrigatoŕio");
    // }

    // // response.send(`Usuário: ${name}. E-mail: ${email}.E a senha é: ${password}`)
    // response.status(201).json({ name, email, password })
  }

  async update(request, response) {
    const { name, email, password, old_password } = request.body
    // const { id } = request.params começou pegar id pelo middleware
    const user_id = request.user.id

    const database = await sqliteConnection()
    const user = await database.get("SELECT * FROM users WHERE id = (?)", [user_id])

    if(!user) {
     throw new AppError("Usuário não encontrado")
    }

    const userWithUpdatedEmail = await database.get("SELECT * FROM users WHERE email = (?)", [email])

    if(userWithUpdatedEmail && userWithUpdatedEmail.id !== user.id) {
     throw new AppError("Este e-mail já está em uso.")
    }

    user.name = name ?? user.name; //essa é a validação para continuar o que ja estava caso não seja passado
    user.email= email ?? user.email; //nullish operator

    if(password && !old_password) {
      throw new AppError("Você precisa informar a senha antiga para definir a nova senha")
    }

    if(password && old_password) {
      const checkOldPassword = await compare(old_password, user.password);

      if(!checkOldPassword) {
        throw new AppError("A senha antiga não confere.")
      }

      user.password = await hash(password, 8)
    }

    await database.run(`
     UPDATE users SET
     name = ?,
     email = ?,
     password = ?,
     updated_at = DATETIME('now')
     WHERE id = ?`,
     [user.name, user.email, user.password, user_id]
   )

   return response.json()
 }
}

module.exports = UsersController;