import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// Без цього поля неможливо відповісти на просте питання: чи використовується
// шаблон хоч десь. А без відповіді видалення шаблону мовчки зносить основу
// живого конкурсу.
//
// SET UNULL, а не CASCADE: видалення шаблону не має тягнути за собою номінації
// конкурсу — вони вже живуть своїм життям, з власними цінами й заявками.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('nominations', 'templateId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'category_templates', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('nominations', {
      fields: ['templateId'],
      name: 'nominations_template_id_idx',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex('nominations', 'nominations_template_id_idx');
    await queryInterface.removeColumn('nominations', 'templateId');
  },
};
