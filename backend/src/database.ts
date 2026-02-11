import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || "ethos",
  process.env.POSTGRES_USER || "ethos",
  process.env.POSTGRES_PASSWORD || "ethos_dev_password_2026",
  {
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    dialect: "postgres",
    logging: false,
  }
);

export default sequelize;
