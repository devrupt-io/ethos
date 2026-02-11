import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../database";

interface CommentAttributes {
  id: number;
  hnId: number;
  storyHnId: number;
  parentHnId: number | null;
  text: string | null;
  by: string | null;
  time: number;
  argumentSummary: string | null;
  concepts: string[] | null;
  technologies: string[] | null;
  entities: string[] | null;
  commentType: string | null;
  sentiment: string | null;
  sentimentScore: number | null;
  analysisVersion: string | null;
  embedded: boolean;
  processedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CommentCreationAttributes extends Optional<CommentAttributes, "id" | "argumentSummary" | "concepts" | "technologies" | "entities" | "commentType" | "sentiment" | "sentimentScore" | "analysisVersion" | "embedded" | "processedAt"> {}

class Comment extends Model<CommentAttributes, CommentCreationAttributes> implements CommentAttributes {
  declare id: number;
  declare hnId: number;
  declare storyHnId: number;
  declare parentHnId: number | null;
  declare text: string | null;
  declare by: string | null;
  declare time: number;
  declare argumentSummary: string | null;
  declare concepts: string[] | null;
  declare technologies: string[] | null;
  declare entities: string[] | null;
  declare commentType: string | null;
  declare sentiment: string | null;
  declare sentimentScore: number | null;
  declare analysisVersion: string | null;
  declare embedded: boolean;
  declare processedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Comment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    hnId: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: false,
    },
    storyHnId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    parentHnId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    time: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    argumentSummary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    concepts: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    technologies: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    entities: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    commentType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sentiment: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sentimentScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    analysisVersion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    embedded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "comments",
    indexes: [
      { fields: ["hnId"], unique: true },
      { fields: ["storyHnId"] },
      { fields: ["embedded"] },
      { fields: ["commentType"] },
    ],
  }
);

export default Comment;
